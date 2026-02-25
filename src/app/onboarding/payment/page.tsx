'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { PRICING_TIERS } from '@/lib/constants/pricing';
import { USDC_BASE, DEPOSIT_ADDRESS, ERC20_ABI } from '@/lib/web3/contracts';
import { createClient } from '@/lib/supabase/client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useWalletClient } from 'wagmi';
import { parseUnits, createPublicClient, http, publicActions } from 'viem';
import { base } from 'wagmi/chains';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, ExternalLink, AlertCircle, CreditCard, Zap } from 'lucide-react';
import { toast } from 'sonner';

type PaymentTab = 'direct' | 'x402';

export default function PaymentPage() {
  const router = useRouter();
  const { plan, paymentStatus, setPaymentProcessing, setPaymentConfirmed, setPaymentFailed, goToStep } = useOnboardingStore();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [usdcSent, setUsdcSent] = useState(false);
  const [activeTab, setActiveTab] = useState<PaymentTab>('direct');
  const [x402Loading, setX402Loading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth/login?redirectTo=/onboarding/payment');
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  const selectedPlan = PRICING_TIERS.find((t) => t.id === plan);
  const displayPrice = selectedPlan?.price ?? 0;
  const chargeAmount = selectedPlan?.chargePrice ?? displayPrice;
  const isCorrectChain = chainId === base.id;

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (writeError) {
      setPaymentFailed();
      toast.error('Transaction failed. Please try again.');
    }
  }, [writeError, setPaymentFailed]);

  useEffect(() => {
    if (isConfirmed && hash && address) {
      setPaymentConfirmed(hash, address, 'direct');
      setUsdcSent(true);
      toast.success('Payment confirmed!');
    }
  }, [isConfirmed, hash, address, setPaymentConfirmed]);

  const handleSendUSDC = () => {
    if (!isConnected || !isCorrectChain) return;
    setPaymentProcessing();

    writeContract({
      address: USDC_BASE.address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [DEPOSIT_ADDRESS, parseUnits(chargeAmount.toString(), USDC_BASE.decimals)],
    });
  };

  const handleX402Pay = useCallback(async () => {
    if (!isConnected || !isCorrectChain || !walletClient || !address) return;

    setX402Loading(true);
    setPaymentProcessing();

    try {
      const { ExactEvmScheme } = await import('@x402/evm');
      const { wrapFetchWithPayment, x402HTTPClient, x402Client } = await import('@x402/fetch');

      // Extend walletClient with publicActions so it has both signTypedData and readContract
      const extendedClient = walletClient.extend(publicActions);

      const signer = {
        address: extendedClient.account.address,
        signTypedData: (args: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
          extendedClient.signTypedData(args as Parameters<typeof extendedClient.signTypedData>[0]),
        readContract: (args: { address: `0x${string}`; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] }) =>
          extendedClient.readContract(args as Parameters<typeof extendedClient.readContract>[0]),
      };

      const client = new x402Client()
        .register('eip155:8453', new ExactEvmScheme(signer));
      const httpClient = new x402HTTPClient(client);

      const x402Fetch = wrapFetchWithPayment(fetch, httpClient);

      const res = await x402Fetch(`/api/payment/x402?plan=${plan}`);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'paid') {
          setPaymentConfirmed('x402-payment', address, 'x402');
          setUsdcSent(true);
          toast.success('Payment confirmed via x402!');
        } else {
          setPaymentFailed();
          toast.error('Payment verification failed.');
        }
      } else {
        setPaymentFailed();
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('x402 payment error:', error);
      setPaymentFailed();
      toast.error('Payment failed. Please try again.');
    } finally {
      setX402Loading(false);
    }
  }, [isConnected, isCorrectChain, walletClient, address, plan, setPaymentProcessing, setPaymentConfirmed, setPaymentFailed]);

  const handleContinue = () => {
    goToStep(4);
    router.push('/onboarding/training');
  };

  const handleBack = () => {
    goToStep(2);
    router.push('/onboarding/pricing');
  };

  const isPaymentDone = paymentStatus === 'confirmed' || usdcSent;

  if (!authChecked) {
    return (
      <div className="space-y-8">
        <ProgressSteps currentStep={3} />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="font-mono text-sm text-neutral-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ProgressSteps currentStep={3} />

      <div className="text-center">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-neutral-900">PAYMENT</h1>
        <p className="mt-2 font-mono text-sm text-neutral-500">
          Pay with USDC on Base to activate your agent
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-6">
        {/* Plan summary */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">Selected plan</p>
              <p className="font-mono text-xl font-bold text-neutral-900">{selectedPlan?.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold text-neutral-900">${displayPrice}</p>
              <p className="font-mono text-xs text-neutral-400">/month</p>
            </div>
          </CardContent>
        </Card>

        {/* USDC Payment */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-neutral-900">
              <div className="flex h-6 w-6 items-center justify-center rounded-none bg-blue-50">
                <CreditCard className="h-3.5 w-3.5 text-blue-600" />
              </div>
              Pay with USDC
              <Badge className="bg-blue-50 text-blue-600 font-mono rounded-none text-xs">Base Chain</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Payment method tabs */}
            {!isPaymentDone && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('direct')}
                  className={`flex-1 py-2 px-3 font-mono text-xs uppercase tracking-wider border transition-colors ${
                    activeTab === 'direct'
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  Direct Transfer
                </button>
                <button
                  onClick={() => setActiveTab('x402')}
                  className={`flex-1 py-2 px-3 font-mono text-xs uppercase tracking-wider border transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'x402'
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  x402 Protocol
                </button>
              </div>
            )}

            {isPaymentDone ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-none border border-orange-200 bg-orange-50">
                  <CheckCircle className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                  <p className="font-mono text-lg font-bold text-neutral-900">PAYMENT CONFIRMED</p>
                  <p className="font-mono text-sm text-neutral-500">Your USDC payment has been received</p>
                </div>
                {hash && (
                  <a
                    href={`https://basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center font-mono text-sm text-orange-500 hover:text-orange-600"
                  >
                    View on BaseScan
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : activeTab === 'direct' ? (
              /* Direct Transfer Tab */
              <>
                {!isConnected ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <p className="font-mono text-sm text-neutral-500">Connect your wallet to pay with USDC</p>
                    <ConnectButton />
                  </div>
                ) : !isCorrectChain ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex items-center gap-2 text-orange-500">
                      <AlertCircle className="h-4 w-4" />
                      <p className="font-mono text-sm">Please switch to Base network</p>
                    </div>
                    <Button
                      onClick={() => switchChain({ chainId: base.id })}
                      className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
                    >
                      Switch to Base
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border border-neutral-200 p-4">
                      <span className="font-mono text-sm text-neutral-500">Amount</span>
                      <span className="font-mono text-lg font-bold text-neutral-900">{chargeAmount} USDC</span>
                    </div>
                    <div className="flex items-center justify-between border border-neutral-200 p-4">
                      <span className="font-mono text-sm text-neutral-500">Network</span>
                      <span className="font-mono text-sm font-bold text-neutral-900">Base</span>
                    </div>
                    <Button
                      onClick={handleSendUSDC}
                      disabled={isPending || isConfirming}
                      className="w-full rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Confirm in wallet...
                        </>
                      ) : isConfirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Confirming transaction...
                        </>
                      ) : (
                        `Send ${chargeAmount} USDC`
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* x402 Protocol Tab */
              <>
                {!isConnected ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <p className="font-mono text-sm text-neutral-500">Connect your wallet to pay via x402</p>
                    <ConnectButton />
                  </div>
                ) : !isCorrectChain ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex items-center gap-2 text-orange-500">
                      <AlertCircle className="h-4 w-4" />
                      <p className="font-mono text-sm">Please switch to Base network</p>
                    </div>
                    <Button
                      onClick={() => switchChain({ chainId: base.id })}
                      className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
                    >
                      Switch to Base
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border border-neutral-200 p-4">
                      <span className="font-mono text-sm text-neutral-500">Amount</span>
                      <span className="font-mono text-lg font-bold text-neutral-900">{chargeAmount} USDC</span>
                    </div>
                    <div className="flex items-center justify-between border border-neutral-200 p-4">
                      <span className="font-mono text-sm text-neutral-500">Protocol</span>
                      <span className="font-mono text-sm font-bold text-neutral-900">x402 (HTTP 402)</span>
                    </div>
                    <div className="border border-neutral-200 p-4">
                      <p className="font-mono text-xs text-neutral-400">
                        Pay via Coinbase&apos;s x402 protocol. You sign an authorization — no gas needed. The facilitator handles the on-chain transfer.
                      </p>
                    </div>
                    <Button
                      onClick={handleX402Pay}
                      disabled={x402Loading}
                      className="w-full rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
                    >
                      {x402Loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing x402 payment...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          {`Pay ${chargeAmount} USDC via x402`}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Stripe coming soon */}
        <Card className="border border-neutral-200 bg-neutral-50 shadow-none rounded-none opacity-50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-neutral-400" />
              <span className="font-mono text-sm text-neutral-400">Pay with Stripe</span>
            </div>
            <Badge className="bg-neutral-200 text-neutral-500 font-mono uppercase text-xs rounded-none">Coming Soon</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="rounded-none border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!isPaymentDone}
          size="lg"
          className="rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600 font-mono uppercase tracking-wider disabled:opacity-50"
        >
          Continue to Training
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
