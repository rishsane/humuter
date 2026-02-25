'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import {
  Bot, ArrowLeft, Loader2,
  MessageSquare, Radio, TrendingUp, Globe, Send, Plus, Save, Trash2, CheckCircle, FileText, X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Agent } from '@/lib/types/agent';

export default function AgentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params.agentId as string;
  const defaultTab = searchParams.get('tab') || 'config';

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  // Telegram setup
  const [botToken, setBotToken] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramBot, setTelegramBot] = useState<{ username: string; name: string } | null>(null);

  // Training data editing
  const [trainingData, setTrainingData] = useState<Record<string, string>>({});
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newLink, setNewLink] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [savingTraining, setSavingTraining] = useState(false);

  // Admin style
  const [adminName, setAdminName] = useState('');
  const [adminMessages, setAdminMessages] = useState('');
  const [adminStyleSaved, setAdminStyleSaved] = useState(false);
  const [rawChatPaste, setRawChatPaste] = useState('');
  const [pasteCollapsed, setPasteCollapsed] = useState(false);
  const [pasteMoreOpen, setPasteMoreOpen] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<string[] | null>(null);
  const [hasAdminTag, setHasAdminTag] = useState(false);
  const [showSavedMessages, setShowSavedMessages] = useState(false);
  const [autoModerate, setAutoModerate] = useState(true);

  useEffect(() => {
    async function fetchAgent() {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setIsActive(data.agent.status === 'active');
        setTrainingData(data.agent.training_data || {});
        setAdditionalContext(data.agent.training_data?.additional_context || '');
        setAdminName(data.agent.training_data?.admin_name || '');
        setAdminMessages(data.agent.training_data?.admin_response_style || '');
        if (data.agent.training_data?.admin_response_style) {
          setAdminStyleSaved(true);
        }
        setAutoModerate(data.agent.auto_moderate !== false);
        if (data.agent.telegram_bot_token) {
          setTelegramBot({ username: 'connected', name: 'Telegram Bot' });
        }
      }
      setLoading(false);
    }
    fetchAgent();
  }, [agentId]);

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

  const parseAdminMessages = () => {
    if (!adminName.trim() || !rawChatPaste.trim()) return;

    const name = adminName.trim().toLowerCase();
    const lines = rawChatPaste.split('\n');
    const extracted: string[] = [];
    let currentSender = '';
    let currentIsAdmin = false;
    let currentMessage = '';

    // Simple approach: a "sender line" is any line containing [ and ] (timestamp bracket).
    // Extract the sender name as everything before the first [ (trimmed of commas/spaces).
    // If [ comes first, sender is between ] and : (mobile format).
    function extractSender(line: string): string | null {
      const bracketIdx = line.indexOf('[');
      const closeBracketIdx = line.indexOf(']');
      if (bracketIdx === -1 || closeBracketIdx === -1 || closeBracketIdx <= bracketIdx) return null;

      if (bracketIdx > 0) {
        // Format: "Name, [date]" or "Name, [date]:"
        return line.substring(0, bracketIdx).replace(/,\s*$/, '').trim();
      } else {
        // Format: "[date] Name:" — extract name after ]
        const afterBracket = line.substring(closeBracketIdx + 1).trim();
        const colonIdx = afterBracket.indexOf(':');
        if (colonIdx > 0) {
          return afterBracket.substring(0, colonIdx).trim();
        }
      }
      return null;
    }

    function matchesSender(senderRaw: string): boolean {
      const senderLower = senderRaw.toLowerCase().trim();
      // Exact match
      if (senderLower === name) return true;
      // Sender starts with admin name or vice versa
      if (senderLower.startsWith(name) || name.startsWith(senderLower)) return true;
      // First word/token match (e.g. "Alex" matches "Alex - Will never DM you first!")
      const nameFirstWord = name.split(/[\s\-–—]+/)[0];
      const senderFirstWord = senderLower.split(/[\s\-–—]+/)[0];
      if (nameFirstWord.length >= 3 && senderFirstWord === nameFirstWord) return true;
      // Check if sender contains the name or name contains the sender
      if (senderLower.includes(name) || name.includes(senderLower)) return true;
      return false;
    }

    for (const line of lines) {
      const sender = extractSender(line);

      if (sender !== null) {
        // This is a sender/header line
        // Save previous message if it was from the admin
        if (currentSender && currentMessage.trim() && currentIsAdmin) {
          extracted.push(currentMessage.trim());
        }

        currentSender = sender;
        currentIsAdmin = matchesSender(sender);

        // Check if there's inline message content after the timestamp
        // e.g. "Name, [date]: message here" — grab everything after ]:
        const closeBracket = line.indexOf(']');
        const afterTimestamp = line.substring(closeBracket + 1).trim();
        // Remove leading colon and whitespace
        const inlineMsg = afterTimestamp.replace(/^:\s*/, '').trim();
        currentMessage = inlineMsg || '';
      } else if (line.trim()) {
        // Message content line
        if (currentMessage) currentMessage += '\n';
        currentMessage += line;
      }
    }

    // Don't forget the last message
    if (currentSender && currentMessage.trim() && currentIsAdmin) {
      extracted.push(currentMessage.trim());
    }

    setHasAdminTag(extracted.length > 0);
    setParsedPreview(extracted);
  };

  const confirmParsedMessages = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setAdminMessages(parsedPreview.join('\n---\n'));
    setAdminStyleSaved(false);
    setRawChatPaste('');
    setParsedPreview(null);
    toast.success(`Extracted ${parsedPreview.length} messages from ${adminName}. Click "Save Training Data" to apply.`);
  };

  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    const existingFaqs = trainingData.faq_items ? trainingData.faq_items : '';
    const newEntry = `Q: ${newFaqQuestion.trim()}\nA: ${newFaqAnswer.trim()}`;
    const updatedFaqs = existingFaqs ? `${existingFaqs}\n\n${newEntry}` : newEntry;
    setTrainingData({ ...trainingData, faq_items: updatedFaqs });
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    const existingLinks = trainingData.reference_links || '';
    const updatedLinks = existingLinks ? `${existingLinks}\n${newLink.trim()}` : newLink.trim();
    setTrainingData({ ...trainingData, reference_links: updatedLinks });
    setNewLink('');
  };

  const handleSaveTraining = async () => {
    setSavingTraining(true);
    try {
      const updatedData = { ...trainingData };
      if (additionalContext.trim()) {
        updatedData.additional_context = additionalContext.trim();
      }
      if (adminMessages.trim()) {
        updatedData.admin_response_style = adminMessages.trim();
      }
      if (adminName.trim()) {
        updatedData.admin_name = adminName.trim();
      }
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_data: updatedData, auto_moderate: autoModerate }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setTrainingData(data.agent.training_data || {});
        if (adminMessages.trim()) {
          setAdminStyleSaved(true);
        }
        toast.success('Training data saved! Your bot will use the updated knowledge.');
      } else {
        toast.error('Failed to save training data');
      }
    } catch {
      toast.error('Failed to save training data');
    } finally {
      setSavingTraining(false);
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

  // Parse FAQs for display
  const faqEntries = (trainingData.faq_items || '').split('\n\n').filter(Boolean);
  const linkEntries = (trainingData.reference_links || '').split('\n').filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents">
          <button className="flex items-center gap-2 px-3 py-2 font-mono text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
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
            <p className="font-mono text-sm text-neutral-500">Telegram Community Manager &middot; {agent.plan} plan</p>
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
          { label: 'Messages', value: String(agent.messages_handled ?? 0), icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
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

      <Tabs defaultValue={defaultTab}>
        <TabsList className="rounded-none border border-neutral-200 bg-white">
          <TabsTrigger value="config" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Configuration</TabsTrigger>
          <TabsTrigger value="training" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Training</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Integrations</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Analytics</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-6 space-y-6">
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Current Training Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(agent.training_data || {}).filter(([, v]) => v).map(([key, value]) => (
                <div key={key} className="border border-neutral-200 bg-neutral-50 rounded-none p-4">
                  <p className="font-mono text-sm font-medium text-neutral-700 capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1 font-mono text-sm text-neutral-500 whitespace-pre-wrap">{value}</p>
                </div>
              ))}
              {Object.keys(agent.training_data || {}).length === 0 && (
                <p className="font-mono text-sm text-neutral-400">No training data yet. Go to the Training tab to add context.</p>
              )}
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
                <p className="font-mono text-sm text-neutral-400">No channels connected yet. Go to Integrations to connect Telegram.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="mt-6 space-y-6">
          {/* Additional context */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Additional Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs text-neutral-400">
                Add any extra information your bot should know — project updates, announcements, tokenomics, how-to guides, etc.
              </p>
              <Textarea
                placeholder="e.g. Our token launched on January 15th. Current price is $0.50. Staking APY is 12%. Users can stake at app.example.com..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white min-h-[120px]"
                rows={5}
              />
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">FAQ Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqEntries.length > 0 && (
                <div className="space-y-3">
                  {faqEntries.map((entry, i) => (
                    <div key={i} className="border border-neutral-200 bg-neutral-50 p-3 relative">
                      <pre className="font-mono text-sm text-neutral-700 whitespace-pre-wrap">{entry}</pre>
                      <button
                        onClick={() => {
                          const updated = faqEntries.filter((_, idx) => idx !== i).join('\n\n');
                          setTrainingData({ ...trainingData, faq_items: updated });
                        }}
                        className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 border border-dashed border-neutral-300 p-4">
                <Input
                  placeholder="Question: e.g. How do I stake tokens?"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                />
                <Textarea
                  placeholder="Answer: e.g. Go to app.example.com, connect your wallet, and click Stake..."
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                  rows={2}
                />
                <button
                  onClick={handleAddFaq}
                  disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                  className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add FAQ
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Reference Links */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Reference Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs text-neutral-400">
                Add links to your docs, website, or resources. The bot will reference these when answering questions.
              </p>
              {linkEntries.length > 0 && (
                <div className="space-y-2">
                  {linkEntries.map((link, i) => (
                    <div key={i} className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
                      <span className="font-mono text-sm text-neutral-700 truncate">{link}</span>
                      <button
                        onClick={() => {
                          const updated = linkEntries.filter((_, idx) => idx !== i).join('\n');
                          setTrainingData({ ...trainingData, reference_links: updated });
                        }}
                        className="text-neutral-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="https://docs.example.com"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                />
                <button
                  onClick={handleAddLink}
                  disabled={!newLink.trim()}
                  className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Learn from admin messages */}
          <Card className="border border-orange-200 bg-orange-50 rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Learn From Admin Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs text-neutral-600">
                Copy messages from your Telegram group and paste them here. We&apos;ll automatically extract only the admin&apos;s messages and teach the bot their communication style.
              </p>

              {adminStyleSaved && adminMessages && (
                <div className="border border-green-200 bg-green-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <p className="font-mono text-sm font-medium text-green-700">
                          Style learned from {adminName || 'admin'} ({adminMessages.split('---').length} messages)
                        </p>
                        <p className="font-mono text-xs text-green-600 mt-1">
                          Your bot is mirroring this style. Paste more messages below to update.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSavedMessages(!showSavedMessages)}
                      className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider border border-green-300 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      {showSavedMessages ? 'Hide' : 'View'} Messages
                    </button>
                  </div>
                  {showSavedMessages && (
                    <div className="max-h-[300px] overflow-y-auto space-y-2 border border-green-200 bg-white p-3">
                      {adminMessages.split('---').map((msg, i) => (
                        <div key={i} className="border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                          <p className="font-mono text-xs text-neutral-500 mb-1">Message {i + 1}</p>
                          <p className="font-mono text-sm text-neutral-700 whitespace-pre-wrap">{msg.trim()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                  Admin&apos;s Name (as shown in Telegram)
                </label>
                <Input
                  placeholder="e.g. Alex"
                  value={adminName}
                  onChange={(e) => {
                    setAdminName(e.target.value);
                    setParsedPreview(null);
                  }}
                  className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                />
              </div>

              {/* Paste area */}
              {!parsedPreview && (
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                    Paste Chat Messages (from everyone)
                  </label>

                  {pasteCollapsed && rawChatPaste ? (
                    <div className="border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-none bg-orange-50 p-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-neutral-900">chat_export.txt</p>
                            <p className="font-mono text-xs text-neutral-400">
                              {rawChatPaste.split('\n').length} lines &middot; {(rawChatPaste.length / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPasteMoreOpen(!pasteMoreOpen)}
                            className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                          >
                            + Paste More
                          </button>
                          <button
                            onClick={() => setPasteCollapsed(false)}
                            className="px-2 py-1 font-mono text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setRawChatPaste(''); setPasteCollapsed(false); }}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="border border-neutral-200 bg-white p-3 max-h-[100px] overflow-hidden relative">
                        <pre className="font-mono text-xs text-neutral-400 whitespace-pre-wrap">{rawChatPaste.slice(0, 500)}</pre>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                      </div>
                      {pasteMoreOpen && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Paste your next batch of messages here..."
                            className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white min-h-[150px]"
                            rows={6}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text');
                              if (pasted.trim()) {
                                e.preventDefault();
                                setRawChatPaste((prev) => prev + '\n' + pasted);
                                setPasteMoreOpen(false);
                                toast.success(`Added ${pasted.split('\n').length} more lines`);
                              }
                            }}
                          />
                          <p className="font-mono text-xs text-neutral-400">
                            Paste the next batch here. It will be appended automatically.
                          </p>
                        </div>
                      )}
                      <p className="font-mono text-xs text-neutral-400 italic">
                        Telegram limits how many messages you can copy at once. Use &quot;+ Paste More&quot; to add multiple batches.
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      placeholder={"Select and copy messages from your Telegram group chat, then paste here.\n\nExample format:\nAlex, [25.02.2026 10:30]\nHey welcome to the community!\n\nSarah, [25.02.2026 10:31]\nThanks! How do I get started?\n\nAlex, [25.02.2026 10:32]\nHead to our docs at docs.example.com and follow the guide"}
                      value={rawChatPaste}
                      onChange={(e) => {
                        setRawChatPaste(e.target.value);
                        if (e.target.value.split('\n').length > 10) {
                          setPasteCollapsed(true);
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted.length > 200) {
                          e.preventDefault();
                          setRawChatPaste((prev) => prev ? prev + '\n' + pasted : pasted);
                          setPasteCollapsed(true);
                        }
                      }}
                      className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white min-h-[400px]"
                      rows={20}
                    />
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="font-mono text-xs text-neutral-400">
                      Paste all messages — we&apos;ll extract only {adminName || 'the admin'}&apos;s
                    </p>
                    <button
                      onClick={parseAdminMessages}
                      disabled={!adminName.trim() || !rawChatPaste.trim()}
                      className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Extract Messages
                    </button>
                  </div>
                </div>
              )}

              {/* Parsed preview */}
              {parsedPreview && (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 p-3 border ${parsedPreview.length > 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                    {parsedPreview.length > 0 ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <p className="font-mono text-xs text-green-700">
                          Found {parsedPreview.length} messages from <strong>{adminName}</strong>. Review below and confirm.
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="font-mono text-xs text-amber-700">
                          No messages found from <strong>{adminName}</strong>. Try using just the first name (e.g. &quot;Alex&quot; instead of the full display name).
                        </p>
                      </>
                    )}
                  </div>

                  {parsedPreview.length > 0 ? (
                    <>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 border border-neutral-200 bg-white p-3">
                        {parsedPreview.slice(0, 20).map((msg, i) => (
                          <div key={i} className="border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                            <p className="font-mono text-xs text-neutral-600">{msg}</p>
                          </div>
                        ))}
                        {parsedPreview.length > 20 && (
                          <p className="font-mono text-xs text-neutral-400 text-center pt-2">
                            ... and {parsedPreview.length - 20} more messages
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={confirmParsedMessages}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Use These {parsedPreview.length} Messages
                        </button>
                        <button
                          onClick={() => { setParsedPreview(null); setRawChatPaste(''); }}
                          className="px-4 py-2.5 font-mono text-sm uppercase tracking-wider border border-neutral-200 text-neutral-600 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="border border-red-200 bg-red-50 p-4">
                      <p className="font-mono text-sm text-red-600">
                        No messages found from &quot;{adminName}&quot;. Check the name matches exactly how it appears in Telegram.
                      </p>
                      <button
                        onClick={() => setParsedPreview(null)}
                        className="mt-2 font-mono text-xs text-red-500 underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="border border-neutral-200 bg-white p-3 space-y-1">
                <p className="font-mono text-xs font-medium text-neutral-500">How to copy messages from Telegram:</p>
                <p className="font-mono text-xs text-neutral-400">1. Open your Telegram group → scroll to older messages</p>
                <p className="font-mono text-xs text-neutral-400">2. Long-press a message → Select → pick all messages you want</p>
                <p className="font-mono text-xs text-neutral-400">3. Tap the copy/forward icon → paste here</p>
                <p className="font-mono text-xs text-neutral-400 mt-2 italic">
                  Enter the admin&apos;s name exactly as shown in Telegram (or just their first name). We&apos;ll extract only their messages.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Moderation */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <p className="font-mono text-sm font-bold text-neutral-900">Auto-Moderation</p>
                <p className="font-mono text-xs text-neutral-500">
                  Automatically delete FUD, spam, and scam messages from your group. When disabled, the bot will still respond but won&apos;t delete any messages.
                </p>
              </div>
              <Switch checked={autoModerate} onCheckedChange={setAutoModerate} />
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveTraining}
              disabled={savingTraining}
              className="flex items-center gap-2 px-6 py-3 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {savingTraining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Training Data
            </button>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
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
                  <button
                    onClick={handleDisconnectTelegram}
                    disabled={telegramLoading}
                    className="flex items-center gap-2 px-3 py-2 font-mono text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {telegramLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Disconnect Bot
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-mono text-sm text-neutral-500">
                    Connect a Telegram bot to let your agent manage your community group.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Paste your Telegram bot token"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                    />
                    <button
                      onClick={handleConnectTelegram}
                      disabled={telegramLoading || !botToken.trim()}
                      className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {telegramLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Connect
                    </button>
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          {/* Usage Bar */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const messagesUsed = agent.messages_handled ?? 0;
                const msgLimits: Record<string, number> = { starter: 5000, growth: 50000, pro: 500000 };
                const msgLimit = msgLimits[agent.plan] || 5000;
                const msgPct = Math.min((messagesUsed / msgLimit) * 100, 100);
                const msgHigh = msgPct >= 80;

                const tokensUsed = agent.tokens_used ?? 0;
                const tokenLimits: Record<string, number> = { starter: 500000, growth: 5000000, pro: 50000000 };
                const tokenLimit = tokenLimits[agent.plan] || 500000;
                const tokenPct = Math.min((tokensUsed / tokenLimit) * 100, 100);
                const tokenHigh = tokenPct >= 80;

                const anyHigh = msgHigh || tokenHigh;
                return (
                  <>
                    {/* Messages bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm text-neutral-600">Messages handled</p>
                        <p className="font-mono text-sm font-bold text-neutral-900">
                          {messagesUsed.toLocaleString()} / {msgLimit.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-full bg-neutral-100 h-3 rounded-none">
                        <div
                          className={`h-3 rounded-none transition-all ${msgHigh ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${msgPct}%` }}
                        />
                      </div>
                      <p className={`font-mono text-xs text-right ${msgHigh ? 'text-red-500 font-medium' : 'text-neutral-400'}`}>
                        {msgPct.toFixed(0)}% used
                      </p>
                    </div>

                    {/* Tokens bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm text-neutral-600">Tokens consumed</p>
                        <p className="font-mono text-sm font-bold text-neutral-900">
                          {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-full bg-neutral-100 h-3 rounded-none">
                        <div
                          className={`h-3 rounded-none transition-all ${tokenHigh ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${tokenPct}%` }}
                        />
                      </div>
                      <p className={`font-mono text-xs text-right ${tokenHigh ? 'text-red-500 font-medium' : 'text-neutral-400'}`}>
                        {tokenPct.toFixed(0)}% used
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-neutral-400 capitalize">{agent.plan} plan — monthly</p>
                    </div>
                    {anyHigh && (
                      <div className="border border-red-200 bg-red-50 p-3">
                        <p className="font-mono text-xs text-red-600">
                          You&apos;re approaching your plan limit. Consider upgrading for uninterrupted service.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AnalyticsChart />
            <ActivityFeed />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
