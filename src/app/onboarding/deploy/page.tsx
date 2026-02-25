'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { Input } from '@/components/ui/input';
import { Copy, Check, Key, ArrowRight, AlertTriangle, Rocket, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function DeployPage() {
  const router = useRouter();
  const { agentType, industry, plan, trainingData, skillFileUrl, agentId, setDeployment, reset } = useOnboardingStore();
  const [apiKey, setApiKey] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
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
    // If onboarding state was lost (e.g. page refresh after login), redirect to start
    if (!agentType || !plan) {
      router.push('/onboarding');
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
        setApiKey(data.apiKey);
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
  }, [agentType, industry, plan, trainingData, skillFileUrl, setDeployment]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    reset();
    router.push('/dashboard');
  };

  const telegramSnippet = `// Telegram Bot Integration
const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN');

bot.on('message', async (ctx) => {
  const response = await axios.post('https://api.humuter.com/v1/chat', {
    message: ctx.message.text,
    channel: 'telegram',
    user_id: ctx.from.id.toString(),
  }, {
    headers: {
      'Authorization': 'Bearer ${apiKey}',
      'Content-Type': 'application/json',
    },
  });

  await ctx.reply(response.data.reply);
});

bot.launch();`;

  const discordSnippet = `// Discord Bot Integration
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const response = await axios.post('https://api.humuter.com/v1/chat', {
    message: message.content,
    channel: 'discord',
    user_id: message.author.id,
  }, {
    headers: {
      'Authorization': 'Bearer ${apiKey}',
      'Content-Type': 'application/json',
    },
  });

  await message.reply(response.data.reply);
});

client.login('YOUR_DISCORD_BOT_TOKEN');`;

  const widgetSnippet = `<!-- Website Widget -->
<script src="https://cdn.humuter.com/widget.js"></script>
<script>
  Humuter.init({
    apiKey: '${apiKey}',
    theme: 'dark',
    position: 'bottom-right',
    welcomeMessage: 'Hi! How can I help you today?',
  });
</script>`;

  const restApiSnippet = `// REST API
const response = await fetch('https://api.humuter.com/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'How do I stake tokens?',
    channel: 'api',
    user_id: 'user_123',
    context: {}, // optional context
  }),
});

const data = await response.json();
console.log(data.reply);`;

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

  if (deployError) {
    return (
      <div className="space-y-8">
        <ProgressSteps currentStep={5} />
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
          <p className="font-mono text-sm text-red-600 mb-4">{deployError}</p>
          <Button
            onClick={() => {
              createdRef.current = false;
              setDeployError(null);
              setIsDeploying(true);
              // Re-trigger by forcing a re-render — reset ref and re-mount
              window.location.reload();
            }}
            className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
          >
            Retry
          </Button>
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
          Use your API key to integrate your agent anywhere
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* API Key */}
        <Card className="border border-orange-200 bg-orange-50 shadow-none rounded-none">
          <CardHeader className="border-b border-orange-200">
            <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-neutral-900">
              <Key className="h-5 w-5 text-orange-500" />
              Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-neutral-50 border border-neutral-200 p-4 font-mono text-sm text-neutral-900 rounded-none break-all">
                {apiKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(apiKey)}
                className="shrink-0 border-neutral-200 rounded-none"
              >
                {copied ? <Check className="h-4 w-4 text-orange-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p className="font-mono text-sm text-orange-700">
                Save this API key now. It won&apos;t be shown again. You can regenerate it from the dashboard.
              </p>
            </div>
            <label className="flex items-center gap-2 font-mono text-sm text-neutral-500">
              <input
                type="checkbox"
                checked={keySaved}
                onChange={(e) => setKeySaved(e.target.checked)}
                className="rounded-none border-neutral-300"
              />
              I have saved my API key
            </label>
          </CardContent>
        </Card>

        {/* Telegram Bot Setup */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-neutral-900">
              <Send className="h-5 w-5 text-blue-500" />
              Connect Telegram Bot
              {telegramBot && (
                <Badge className="bg-green-50 text-green-700 rounded-none font-mono text-xs ml-auto">Connected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {telegramBot ? (
              <div className="flex items-center justify-between border border-green-200 bg-green-50 p-4">
                <p className="font-mono text-sm text-green-700">
                  Bot @{telegramBot.username} connected — add it to your Telegram group as admin
                </p>
              </div>
            ) : (
              <>
                <p className="font-mono text-sm text-neutral-500">
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
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <p className="font-mono text-xs text-neutral-400">
                    Steps: 1. Open Telegram → @BotFather → /newbot → 2. Copy the token → 3. Paste here → 4. Add bot to your group as admin
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Integration Snippets */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">Integration Guide</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="telegram">
              <TabsList className="grid w-full grid-cols-4 bg-neutral-100 rounded-none">
                <TabsTrigger value="telegram" className="font-mono uppercase text-xs tracking-wider rounded-none data-[state=active]:bg-neutral-900 data-[state=active]:text-white">Telegram</TabsTrigger>
                <TabsTrigger value="discord" className="font-mono uppercase text-xs tracking-wider rounded-none data-[state=active]:bg-neutral-900 data-[state=active]:text-white">Discord</TabsTrigger>
                <TabsTrigger value="widget" className="font-mono uppercase text-xs tracking-wider rounded-none data-[state=active]:bg-neutral-900 data-[state=active]:text-white">Widget</TabsTrigger>
                <TabsTrigger value="api" className="font-mono uppercase text-xs tracking-wider rounded-none data-[state=active]:bg-neutral-900 data-[state=active]:text-white">REST API</TabsTrigger>
              </TabsList>
              {[
                { value: 'telegram', code: telegramSnippet },
                { value: 'discord', code: discordSnippet },
                { value: 'widget', code: widgetSnippet },
                { value: 'api', code: restApiSnippet },
              ].map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  <div className="relative">
                    <pre className="overflow-x-auto bg-neutral-900 text-neutral-100 rounded-none font-mono p-4 text-sm">
                      <code>{tab.code}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(tab.code)}
                      className="absolute top-2 right-2 text-neutral-400 hover:text-white rounded-none"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
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
                <span className="font-mono text-sm text-neutral-500">Agent Type</span>
                <Badge variant="outline" className="border-neutral-200 text-neutral-700 rounded-none font-mono">
                  {agentType?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-mono text-sm text-neutral-500">Plan</span>
                <Badge variant="outline" className="border-neutral-200 text-neutral-700 rounded-none font-mono">
                  {plan}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-mono text-sm text-neutral-500">Project</span>
                <span className="font-mono text-sm text-neutral-900">{trainingData.project_name || 'N/A'}</span>
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
          disabled={!keySaved}
          size="lg"
          className="rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600 font-mono uppercase tracking-wider disabled:opacity-50"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
