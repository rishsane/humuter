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
          Connect your Telegram bot to start managing your community
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Step 1: Connect Telegram Bot */}
        <Card className={`border shadow-none rounded-none ${telegramBot ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardHeader className={`border-b ${telegramBot ? 'border-green-200' : 'border-orange-200'}`}>
            <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-neutral-900">
              {telegramBot ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Send className="h-5 w-5 text-blue-500" />
              )}
              Step 1: Connect Telegram Bot
              {telegramBot && (
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
            ) : (
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
                    1. Open Telegram → search @BotFather → /newbot
                  </p>
                  <p className="font-mono text-xs text-neutral-400 mt-1">
                    2. Copy the bot token → paste here → click Connect
                  </p>
                  <p className="font-mono text-xs text-neutral-400 mt-1">
                    3. Add the bot to your Telegram group as admin
                  </p>
                  <p className="font-mono text-xs text-neutral-400 mt-1">
                    4. Disable privacy mode: @BotFather → /mybots → select bot → Bot Settings → Group Privacy → Turn off
                  </p>
                </div>
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
                  Telegram Community Manager
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
