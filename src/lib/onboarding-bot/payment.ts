import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { USDC_BASE, DEPOSIT_ADDRESS } from '@/lib/web3/contracts';
import { PRICING_TIERS, getChargeAmount } from '@/lib/constants/pricing';
import type { BillingCycle } from '@/lib/constants/pricing';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
});

export function getPaymentAmount(plan: string, billingCycle: BillingCycle): number {
  const tier = PRICING_TIERS.find((t) => t.id === plan);
  if (!tier) return 0;
  return getChargeAmount(tier, billingCycle);
}

export function getDepositAddress(): string {
  return DEPOSIT_ADDRESS;
}

export async function verifyUsdcPayment(txHash: string): Promise<{
  verified: boolean;
  error?: string;
}> {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed on-chain.' };
    }

    // Verify it was a USDC transfer to our deposit address
    const logs = receipt.logs.filter(
      (log) => log.address.toLowerCase() === USDC_BASE.address.toLowerCase()
    );

    const validTransfer = logs.some((log) => {
      try {
        const toAddress = '0x' + log.topics[2]?.slice(26);
        return toAddress?.toLowerCase() === DEPOSIT_ADDRESS.toLowerCase();
      } catch {
        return false;
      }
    });

    if (!validTransfer) {
      return { verified: false, error: 'No valid USDC transfer to Humuter found in this transaction.' };
    }

    return { verified: true };
  } catch (error) {
    console.error('[onboarding] Payment verification error:', error);
    return { verified: false, error: 'Could not verify transaction. Please check the hash and try again.' };
  }
}
