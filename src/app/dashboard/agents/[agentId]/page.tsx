'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import {
  Bot, Key, Copy, Check, ArrowLeft, Loader2,
  MessageSquare, Radio, TrendingUp, Globe, Send,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Agent } from '@/lib/types/agent';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Telegram setup
  const [botToken, setBotToken] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramBot, setTelegramBot] = useState<{ username: string; name: string } | null>(null);

  useEffect(() => {
    async function fetchAgent() {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setIsActive(data.agent.status === 'active');
        if (data.agent.telegram_bot_token) {
          setTelegramBot({ username: 'connected', name: 'Telegram Bot' });
        }
      }
      setLoading(false);
    }
    fetchAgent();
  }, [agentId]);

  const handleCopy = () => {
    if (!agent?.api_key_prefix) return;
    navigator.clipboard.writeText(agent.api_key_prefix);
    setCopied(true);
    toast.success('API key prefix copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (checked: boolean) => {
    setIsActive(checked);
    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: checked ? 'active' : 'paused' }),
    });
    if (res.ok) {
      toast.success(checked ? 'Agent activated' : 'Agent paused');
    } else {
      setIsActive(!checked);
      toast.error('Failed to update status');
    }
  };

  const handleConnectTelegram = async () => {
    if (!botToken.trim()) {
      toast.error('Please enter a bot token');
      return;
    }
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

  const handleDisconnectTelegram = async () => {
    setTelegramLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/telegram`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTelegramBot(null);
        toast.success('Telegram bot disconnected');
      } else {
        toast.error('Failed to disconnect bot');
      }
    } catch {
      toast.error('Failed to disconnect Telegram bot');
    } finally {
      setTelegramLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="font-mono text-neutral-500">Agent not found</p>
        <Link href="/dashboard/agents" className="mt-4">
          <Button variant="outline" className="rounded-none font-mono">Back to Agents</Button>
        </Link>
      </div>
    );
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents">
          <Button variant="ghost" size="sm" className="rounded-none font-mono text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-none bg-orange-50">
            <Bot className="h-7 w-7 text-orange-500" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-neutral-900">{agent.name}</h1>
            <p className="font-mono text-sm text-neutral-500 capitalize">{agent.agent_type.replace('_', ' ')} &middot; {agent.plan} plan</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-neutral-500">{isActive ? 'Active' : 'Paused'}</span>
          <Switch checked={isActive} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'Messages', value: '0', icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Channels', value: String(agent.channels?.length || 0), icon: Radio, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Quality', value: '--', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Uptime', value: '--', icon: Globe, color: 'text-neutral-900', bg: 'bg-neutral-100' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-none p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-neutral-900">{stat.value}</p>
                <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="config">
        <TabsList className="rounded-none border border-neutral-200 bg-white">
          <TabsTrigger value="config" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-neutral-900 data-[state=active]:text-white">Configuration</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-neutral-900 data-[state=active]:text-white">Integrations</TabsTrigger>
          <TabsTrigger value="api" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-neutral-900 data-[state=active]:text-white">API</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-neutral-900 data-[state=active]:text-white">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6 space-y-6">
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Training Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(agent.training_data || {}).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between border border-neutral-200 bg-neutral-50 rounded-none p-4">
                  <div>
                    <p className="font-mono text-sm font-medium text-neutral-700 capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-1 font-mono text-sm text-neutral-500">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Active Channels</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.channels && agent.channels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {agent.channels.map((channel) => (
                    <Badge key={channel} variant="outline" className="rounded-none border-neutral-200 font-mono text-neutral-700 capitalize">
                      {channel}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-sm text-neutral-400">No channels connected yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          {/* Telegram Integration */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                <Send className="h-5 w-5 text-blue-500" />
                Telegram Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {telegramBot ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border border-green-200 bg-green-50 p-4">
                    <div>
                      <p className="font-mono text-sm font-medium text-green-700">Telegram bot connected</p>
                      {telegramBot.username !== 'connected' && (
                        <p className="font-mono text-xs text-green-600">@{telegramBot.username}</p>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-700 rounded-none font-mono text-xs">Connected</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectTelegram}
                    disabled={telegramLoading}
                    className="rounded-none border-red-200 text-red-600 hover:bg-red-50 font-mono text-sm"
                  >
                    {telegramLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Disconnect Bot
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-mono text-sm text-neutral-500">
                    Connect a Telegram bot to let your agent manage your community group. Create a bot via @BotFather on Telegram, then paste the token below.
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
                      className="rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono text-sm shrink-0"
                    >
                      {telegramLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      Connect
                    </Button>
                  </div>
                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <p className="font-mono text-xs text-neutral-400">
                      Steps: 1. Open Telegram → @BotFather → /newbot → 2. Copy the token → 3. Paste here → 4. Add the bot to your group as admin
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord - coming soon */}
          <Card className="border border-neutral-200 bg-neutral-50 rounded-none shadow-none opacity-60">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-none bg-indigo-50 p-2">
                  <MessageSquare className="h-5 w-5 text-indigo-500" />
                </div>
                <span className="font-mono text-sm text-neutral-500">Discord Bot</span>
              </div>
              <Badge className="bg-neutral-200 text-neutral-500 font-mono uppercase text-xs rounded-none">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6 space-y-6">
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                <Key className="h-5 w-5 text-orange-500" />
                API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-none bg-neutral-900 p-3 font-mono text-sm text-neutral-100">
                  {agent.api_key_prefix || 'No API key'}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-none border-neutral-200">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">API Endpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="block rounded-none bg-neutral-900 p-4 font-mono text-sm text-neutral-100">
                POST {appUrl}/api/v1/chat
              </code>
              <pre className="mt-4 overflow-x-auto rounded-none bg-neutral-900 p-4 font-mono text-sm text-neutral-100">
{`{
  "message": "How do I stake tokens?",
  "channel": "api",
  "user_id": "user_123"
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AnalyticsChart />
            <ActivityFeed />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
