'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { Input } from '@/components/ui/input';
import { ArrowRight, AlertTriangle, Rocket, Loader2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DeployPage() {
  const router = useRouter();
  const { agentType, industry, plan, billingCycle, trainingData, skillFileUrl, agentId, setDeployment, reset } = useOnboardingStore();
  const [isDeploying, setIsDeploying] = useState(true);
  const [deployError, setDeployError] = useState<string | null>(null);
  const createdRef = useRef(false);

  // Telegram
  const [botToken, setBotToken] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramBot, setTelegramBot] = useState<{ username: string } | null>(null);
  const [telegramMode, setTelegramMode] = useState<'bot' | 'personal'>('bot');
  const [telegramAccountConnected, setTelegramAccountConnected] = useState(false);

  // Personal account auth
  const [accountPhone, setAccountPhone] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountAuthStep, setAccountAuthStep] = useState<'phone' | 'code' | '2fa'>('phone');
  const [accountLoading, setAccountLoading] = useState(false);

  const handleConnectTelegram = async () => {
    if (!botToken.trim() || !agentId) return;
    setTelegramLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_token: botToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramBot(data.bot);
        setBotToken('');
        toast.success(`Telegram bot @${data.bot.username} connected!`);
      } else {
        toast.error(data.error || 'Failed to connect bot');
      }
    } catch {
      toast.error('Failed to connect Telegram bot');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!accountPhone.trim() || !agentId) return;
    setAccountLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/telegram-account/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: accountPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccountAuthStep('code');
        toast.success('Verification code sent to your Telegram');
      } else {
        toast.error(data.error || 'Failed to send code');
      }
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!accountCode.trim() || !agentId) return;
    setAccountLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/telegram-account/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: accountPhone,
          code: accountCode,
          password: accountPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requires_2fa) {
          setAccountAuthStep('2fa');
          toast.info('Two-factor authentication required');
        } else {
          setTelegramAccountConnected(true);
          toast.success(`Personal account connected (${data.account?.name || accountPhone})`);
        }
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Verification failed');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSubmit2FA = async () => {
    if (!accountPassword.trim()) {
      toast.error('Please enter your 2FA password');
      return;
    }
    await handleVerifyCode();
  };

  useEffect(() => {
    // If onboarding state was lost (e.g. page refresh after login), redirect to dashboard
    if (!agentType || !plan) {
      router.push('/dashboard');
      return;
    }

    if (createdRef.current) return;
    createdRef.current = true;

    async function createAgent() {
      try {
        setIsDeploying(true);
        setDeployError(null);

        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trainingData.project_name || `My ${agentType?.replace('_', ' ')} Agent`,
            industry: industry || 'blockchain',
            agent_type: agentType,
            plan,
            billing_cycle: billingCycle,
            training_data: trainingData,
            skill_file_url: skillFileUrl,
          }),
        });

        if (res.status === 401) {
          router.push('/auth/login?redirectTo=/onboarding/deploy');
          return;
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create agent');
        }

        const data = await res.json();
        setDeployment(data.agent.id, data.apiKey);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deploy agent';
        setDeployError(message);
        toast.error(message);
      } finally {
        setIsDeploying(false);
      }
    }

    createAgent();
  }, [agentType, industry, plan, billingCycle, trainingData, skillFileUrl, setDeployment, router]);

  const handleGoToDashboard = () => {
    reset();
    router.push('/dashboard');
  };

  if (isDeploying) {
    return (
      <div className="space-y-8">
        <ProgressSteps currentStep={5} />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="font-mono text-sm text-neutral-500">Deploying your agent...</p>
        </div>
      </div>
    );
  }

  const isAgentLimitError = deployError?.includes('1 agent during early access');

  if (deployError) {
    return (
      <div className="space-y-8">
        <ProgressSteps currentStep={5} />
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
          <p className="font-mono text-sm text-red-600 mb-4">{deployError}</p>
          {isAgentLimitError ? (
            <div className="text-center space-y-3">
              <p className="font-mono text-xs text-neutral-500">
                During early access, each account is limited to 1 agent. Multi-agent support is coming soon.
              </p>
              <Button
                onClick={() => {
                  reset();
                  router.push('/dashboard');
                }}
                className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                createdRef.current = false;
                setDeployError(null);
                setIsDeploying(true);
                window.location.reload();
              }}
              className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ProgressSteps currentStep={5} />

      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-none border border-orange-200 bg-orange-50">
          <Rocket className="h-8 w-8 text-orange-500" />
        </div>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-neutral-900">YOUR AGENT IS READY</h1>
        <p className="mt-2 font-mono text-sm text-neutral-500">
          Connect Telegram to start managing your community
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Step 1: Connect Telegram */}
        <Card className={`border shadow-none rounded-none ${(telegramBot || telegramAccountConnected) ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardHeader className={`border-b ${(telegramBot || telegramAccountConnected) ? 'border-green-200' : 'border-orange-200'}`}>
            <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-neutral-900">
              {(telegramBot || telegramAccountConnected) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Send className="h-5 w-5 text-blue-500" />
              )}
              Step 1: Connect Telegram
              {(telegramBot || telegramAccountConnected) && (
                <Badge className="bg-green-100 text-green-700 rounded-none font-mono text-xs ml-auto">Connected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {telegramBot ? (
              <div className="space-y-3">
                <p className="font-mono text-sm text-green-700">
                  Bot @{telegramBot.username} connected successfully!
                </p>
                <div className="border border-green-200 bg-white p-3">
                  <p className="font-mono text-xs text-neutral-600">
                    Next: Add @{telegramBot.username} to your Telegram group as admin. The bot will start managing your community automatically.
                  </p>
                </div>
              </div>
            ) : telegramAccountConnected ? (
              <div className="space-y-3">
                <p className="font-mono text-sm text-green-700">
                  Personal account connected successfully!
                </p>
                <div className="border border-green-200 bg-white p-3">
                  <p className="font-mono text-xs text-neutral-600">
                    Your agent will respond as your personal Telegram account in groups. Configure allowed groups from the dashboard.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Mode selector */}
                <div className="flex border border-neutral-200">
                  <button
                    onClick={() => { setTelegramMode('bot'); setAccountAuthStep('phone'); }}
                    className={`flex-1 px-4 py-2.5 font-mono text-sm transition-colors ${telegramMode === 'bot' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50'}`}
                  >
                    Bot Mode
                  </button>
                  <button
                    onClick={() => { setTelegramMode('personal'); setAccountAuthStep('phone'); }}
                    className={`flex-1 px-4 py-2.5 font-mono text-sm transition-colors ${telegramMode === 'personal' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50'}`}
                  >
                    Personal Account
                  </button>
                </div>

                {telegramMode === 'bot' ? (
                  <>
                    <p className="font-mono text-sm text-neutral-600">
                      Create a bot via @BotFather on Telegram, then paste the token below. We&apos;ll handle the rest.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Paste your Telegram bot token"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                      />
                      <Button
                        onClick={handleConnectTelegram}
                        disabled={telegramLoading || !botToken.trim()}
                        className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider text-xs shrink-0"
                      >
                        {telegramLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                        Connect
                      </Button>
                    </div>
                    <div className="border border-neutral-200 bg-white p-3">
                      <p className="font-mono text-xs text-neutral-400">
                        1. Open Telegram &rarr; search @BotFather &rarr; /newbot
                      </p>
                      <p className="font-mono text-xs text-neutral-400 mt-1">
                        2. Copy the bot token &rarr; paste here &rarr; click Connect
                      </p>
                      <p className="font-mono text-xs text-neutral-400 mt-1">
                        3. Add the bot to your Telegram group as admin
                      </p>
                      <p className="font-mono text-xs text-neutral-400 mt-1">
                        4. Disable privacy mode: @BotFather &rarr; /mybots &rarr; select bot &rarr; Bot Settings &rarr; Group Privacy &rarr; Turn off
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-amber-200 bg-amber-50 p-3">
                      <p className="font-mono text-xs text-amber-700">
                        <strong>Disclaimer:</strong> Personal account automation may violate Telegram&apos;s Terms of Service. By proceeding, you acknowledge this risk and accept full responsibility. Humuter is not liable for any account restrictions.
                      </p>
                    </div>

                    {accountAuthStep === 'phone' && (
                      <div className="space-y-3">
                        <p className="font-mono text-sm text-neutral-600">
                          Enter your phone number to connect your personal Telegram account.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="tel"
                            placeholder="+1234567890"
                            value={accountPhone}
                            onChange={(e) => setAccountPhone(e.target.value)}
                            className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                          />
                          <Button
                            onClick={handleSendCode}
                            disabled={accountLoading || !accountPhone.trim()}
                            className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider text-xs shrink-0"
                          >
                            {accountLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            Send Code
                          </Button>
                        </div>
                      </div>
                    )}

                    {accountAuthStep === 'code' && (
                      <div className="space-y-3">
                        <div className="border border-blue-200 bg-blue-50 p-3">
                          <p className="font-mono text-xs text-blue-700">
                            Verification code sent to <strong>{accountPhone}</strong>. Check your Telegram app.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter verification code"
                            value={accountCode}
                            onChange={(e) => setAccountCode(e.target.value)}
                            className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                          />
                          <Button
                            onClick={handleVerifyCode}
                            disabled={accountLoading || !accountCode.trim()}
                            className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider text-xs shrink-0"
                          >
                            {accountLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            Verify
                          </Button>
                        </div>
                        <button
                          onClick={() => setAccountAuthStep('phone')}
                          className="font-mono text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          &larr; Use a different number
                        </button>
                      </div>
                    )}

                    {accountAuthStep === '2fa' && (
                      <div className="space-y-3">
                        <div className="border border-blue-200 bg-blue-50 p-3">
                          <p className="font-mono text-xs text-blue-700">
                            Two-factor authentication is enabled. Enter your 2FA password.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder="Enter your 2FA password"
                            value={accountPassword}
                            onChange={(e) => setAccountPassword(e.target.value)}
                            className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                          />
                          <Button
                            onClick={handleSubmit2FA}
                            disabled={accountLoading || !accountPassword.trim()}
                            className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider text-xs shrink-0"
                          >
                            {accountLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            Submit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Add more context */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">
              Step 2: Improve Your Bot (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="font-mono text-sm text-neutral-500">
              You can add more context, links, and Q&As to make your bot smarter from the dashboard anytime.
            </p>
            {agentId && (
              <button
                onClick={() => {
                  reset();
                  router.push(`/dashboard/agents/${agentId}?tab=training`);
                }}
                className="w-full border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors text-left"
              >
                Add more training data, links, and FAQs →
              </button>
            )}
          </CardContent>
        </Card>

        {/* Agent Summary */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">Agent Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-mono text-sm text-neutral-500">Agent Name</span>
                <span className="font-mono text-sm font-bold text-neutral-900">{trainingData.project_name || agentType?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-mono text-sm text-neutral-500">Type</span>
                <Badge variant="outline" className="border-neutral-200 text-neutral-700 rounded-none font-mono">
                  Community Manager
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-mono text-sm text-neutral-500">Plan</span>
                <Badge variant="outline" className="border-neutral-200 text-neutral-700 rounded-none font-mono capitalize">
                  {plan} {billingCycle === 'annual' ? '(Annual)' : '(Monthly)'}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-mono text-sm text-neutral-500">Telegram</span>
                {telegramBot ? (
                  <Badge className="bg-green-50 text-green-700 border border-green-200 rounded-none font-mono">@{telegramBot.username}</Badge>
                ) : telegramAccountConnected ? (
                  <Badge className="bg-green-50 text-green-700 border border-green-200 rounded-none font-mono">Personal Account</Badge>
                ) : (
                  <Badge className="bg-neutral-100 text-neutral-400 rounded-none font-mono">Not connected</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-neutral-500">Status</span>
                <Badge className="bg-orange-50 text-orange-500 border border-orange-200 rounded-none font-mono">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleGoToDashboard}
          size="lg"
          className="rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
