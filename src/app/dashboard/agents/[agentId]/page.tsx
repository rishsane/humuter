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
import {
  Bot, ArrowLeft, Loader2,
  MessageSquare, Radio, TrendingUp, Globe, Send, Plus, Save, Trash2, CheckCircle, FileText, X, Upload, User, RefreshCw, Pencil, AlertTriangle, ArrowUpRight, Shield,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Agent } from '@/lib/types/agent';
import type { Escalation } from '@/lib/types/escalation';
import { TOKEN_LIMITS } from '@/lib/constants/pricing';

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
  const [telegramMode, setTelegramMode] = useState<'bot' | 'personal'>('bot');
  const [telegramAccountConnected, setTelegramAccountConnected] = useState(false);
  const [telegramAccountPhone, setTelegramAccountPhone] = useState('');

  // Personal account auth flow
  const [accountPhone, setAccountPhone] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountAuthStep, setAccountAuthStep] = useState<'phone' | 'code' | '2fa'>('phone');
  const [accountLoading, setAccountLoading] = useState(false);

  // Training data editing
  const [trainingData, setTrainingData] = useState<Record<string, string>>({});
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newLink, setNewLink] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [savingTraining, setSavingTraining] = useState(false);

  // Supervisor instructions
  const [supervisorInstructions, setSupervisorInstructions] = useState('');

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
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [autoModerate, setAutoModerate] = useState(true);
  const [chatInputMode, setChatInputMode] = useState<'paste' | 'upload'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Reporting human
  const [reportingHumanId, setReportingHumanId] = useState('');
  const [savingReportingHuman, setSavingReportingHuman] = useState(false);

  // Group whitelist
  const [allowedGroupIds, setAllowedGroupIds] = useState<string[]>([]);
  const [newGroupId, setNewGroupId] = useState('');
  const [savingGroups, setSavingGroups] = useState(false);

  // Escalation chat view
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [escalationsLoading, setEscalationsLoading] = useState(false);

  // Discord setup
  const [discordServerId, setDiscordServerId] = useState('');
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordSupervisorId, setDiscordSupervisorId] = useState('');
  const [savingDiscordSupervisor, setSavingDiscordSupervisor] = useState(false);
  const [discordAllowedChannels, setDiscordAllowedChannels] = useState<string[]>([]);
  const [newDiscordChannelId, setNewDiscordChannelId] = useState('');
  const [savingDiscordChannels, setSavingDiscordChannels] = useState(false);

  // Social context
  const [twitterHandle, setTwitterHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [savingSocials, setSavingSocials] = useState(false);
  const [fetchingSocials, setFetchingSocials] = useState(false);

  useEffect(() => {
    async function fetchAgent() {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setIsActive(data.agent.status === 'active');
        setTrainingData(data.agent.training_data || {});
        setAdditionalContext(data.agent.training_data?.additional_context || '');
        setSupervisorInstructions(data.agent.training_data?.supervisor_instructions || '');
        setAdminName(data.agent.training_data?.admin_name || '');
        setAdminMessages(data.agent.training_data?.admin_response_style || '');
        if (data.agent.training_data?.admin_response_style) {
          setAdminStyleSaved(true);
        }
        setAutoModerate(data.agent.auto_moderate !== false);
        setReportingHumanId(data.agent.reporting_human_chat_id?.toString() || '');
        setAllowedGroupIds((data.agent.allowed_group_ids || []).map(String));
        setTwitterHandle(data.agent.twitter_handle || '');
        setWebsiteUrl(data.agent.training_data?.website_url || '');
        if (data.agent.telegram_bot_token) {
          setTelegramBot({ username: 'connected', name: 'Telegram Bot' });
        }
        if (data.agent.telegram_account_type === 'personal' && data.agent.telegram_account_session) {
          setTelegramAccountConnected(true);
          setTelegramAccountPhone(data.agent.telegram_account_phone || '');
          setTelegramMode('personal');
        }
        if (data.agent.discord_server_id) {
          setDiscordConnected(true);
          setDiscordServerId(data.agent.discord_server_id);
        }
        setDiscordSupervisorId(data.agent.discord_supervisor_user_id || '');
        setDiscordAllowedChannels((data.agent.discord_allowed_channel_ids || []));
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

  const handleSendCode = async () => {
    if (!accountPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
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
    if (!accountCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }
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
          setTelegramAccountPhone(accountPhone);
          setTelegramMode('personal');
          setAccountAuthStep('phone');
          setAccountPhone('');
          setAccountCode('');
          setAccountPassword('');
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

  const handleDisconnectAccount = async () => {
    setAccountLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/telegram-account`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTelegramAccountConnected(false);
        setTelegramAccountPhone('');
        setTelegramMode('bot');
        toast.success('Personal account disconnected');
      } else {
        toast.error('Failed to disconnect account');
      }
    } catch {
      toast.error('Failed to disconnect account');
    } finally {
      setAccountLoading(false);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        // Parse HTML export: extract text content from messages
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        // Telegram HTML exports have div.message with div.from_name and div.text
        const messages = doc.querySelectorAll('.message');
        if (messages.length > 0) {
          const lines: string[] = [];
          messages.forEach((msg) => {
            const fromEl = msg.querySelector('.from_name');
            const textEl = msg.querySelector('.text');
            const dateEl = msg.querySelector('.date');
            const from = fromEl?.textContent?.trim() || '';
            const text = textEl?.textContent?.trim() || '';
            const date = dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || '';
            if (from && text) {
              lines.push(`${from}, [${date}]`);
              lines.push(text);
              lines.push('');
            }
          });
          setRawChatPaste(lines.join('\n'));
        } else {
          // Fallback: strip HTML tags
          const textContent = doc.body?.textContent || content.replace(/<[^>]*>/g, '\n');
          setRawChatPaste(textContent);
        }
      } else {
        // Plain text export
        setRawChatPaste(content);
      }
      setPasteCollapsed(true);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleSaveReportingHuman = async () => {
    setSavingReportingHuman(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporting_human_chat_id: reportingHumanId ? parseInt(reportingHumanId) : null }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        toast.success('Reporting human saved');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingReportingHuman(false);
    }
  };

  const handleAddGroupId = () => {
    const id = newGroupId.trim().replace(/^-/, '-');
    if (!id || allowedGroupIds.includes(id)) return;
    setAllowedGroupIds([...allowedGroupIds, id]);
    setNewGroupId('');
  };

  const handleRemoveGroupId = (id: string) => {
    setAllowedGroupIds(allowedGroupIds.filter((g) => g !== id));
  };

  const handleSaveAllowedGroups = async () => {
    setSavingGroups(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_group_ids: allowedGroupIds.map(Number) }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        toast.success(allowedGroupIds.length > 0 ? 'Allowed groups saved — bot will only respond in these groups' : 'Group restrictions removed — bot will respond in all groups');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingGroups(false);
    }
  };

  const fetchEscalations = async () => {
    setEscalationsLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/escalations`);
      if (res.ok) {
        const data = await res.json();
        setEscalations(data.escalations || []);
      }
    } catch {
      // silent
    } finally {
      setEscalationsLoading(false);
    }
  };

  const handleSaveSocials = async () => {
    setSavingSocials(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twitter_handle: twitterHandle || null,
          training_data: { ...trainingData, website_url: websiteUrl || trainingData.website_url },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setTrainingData(data.agent.training_data || {});
        toast.success('Social links saved');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingSocials(false);
    }
  };

  const handleFetchSocialsNow = async () => {
    setFetchingSocials(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/fetch-socials`, { method: 'POST' });
      if (res.ok) {
        const agentRes = await fetch(`/api/agents/${agentId}`);
        if (agentRes.ok) {
          const data = await agentRes.json();
          setAgent(data.agent);
        }
        toast.success('Social context updated');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to fetch');
      }
    } catch {
      toast.error('Failed to fetch social context');
    } finally {
      setFetchingSocials(false);
    }
  };

  const handleConnectDiscord = async () => {
    if (!discordServerId.trim()) {
      toast.error('Please enter a Discord Server ID');
      return;
    }
    setDiscordLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: discordServerId.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscordConnected(true);
        toast.success('Discord server connected!');
      } else {
        toast.error(data.error || 'Failed to connect Discord');
      }
    } catch {
      toast.error('Failed to connect Discord');
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleDisconnectDiscord = async () => {
    setDiscordLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/discord`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDiscordConnected(false);
        setDiscordServerId('');
        setDiscordSupervisorId('');
        setDiscordAllowedChannels([]);
        toast.success('Discord disconnected');
      } else {
        toast.error('Failed to disconnect Discord');
      }
    } catch {
      toast.error('Failed to disconnect Discord');
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleSaveDiscordSupervisor = async () => {
    setSavingDiscordSupervisor(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_supervisor_user_id: discordSupervisorId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        toast.success('Discord supervisor saved');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingDiscordSupervisor(false);
    }
  };

  const handleAddDiscordChannel = () => {
    const id = newDiscordChannelId.trim();
    if (!id || discordAllowedChannels.includes(id)) return;
    setDiscordAllowedChannels([...discordAllowedChannels, id]);
    setNewDiscordChannelId('');
  };

  const handleRemoveDiscordChannel = (id: string) => {
    setDiscordAllowedChannels(discordAllowedChannels.filter((c) => c !== id));
  };

  const handleSaveDiscordChannels = async () => {
    setSavingDiscordChannels(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_allowed_channel_ids: discordAllowedChannels.length > 0 ? discordAllowedChannels : null }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        toast.success(discordAllowedChannels.length > 0 ? 'Allowed channels saved — bot will only respond in these channels' : 'Channel restrictions removed — bot will respond in all channels');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingDiscordChannels(false);
    }
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
      if (supervisorInstructions.trim()) {
        updatedData.supervisor_instructions = supervisorInstructions.trim();
      } else {
        updatedData.supervisor_instructions = '';
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
            <p className="font-mono text-sm text-neutral-500">Community Manager &middot; {agent.plan} plan</p>
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
          { label: 'Tokens Used', value: (agent.tokens_used ?? 0).toLocaleString(), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Plan', value: agent.plan.charAt(0).toUpperCase() + agent.plan.slice(1), icon: Globe, color: 'text-neutral-900', bg: 'bg-neutral-100' },
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

      {/* Usage limit banners — visible on all tabs */}
      {(() => {
        const tokensUsed = agent.tokens_used ?? 0;
        const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
        const pct = tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0;

        if (pct >= 100) {
          return (
            <div className="flex items-center justify-between border border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-mono text-sm font-medium text-red-700">Your agent has stopped responding — usage limit reached</p>
                  <p className="font-mono text-xs text-red-500 mt-0.5">{tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()} tokens used</p>
                </div>
              </div>
              <Link href="/onboarding/pricing">
                <button className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                  Upgrade Plan
                </button>
              </Link>
            </div>
          );
        }
        if (pct >= 80) {
          return (
            <div className="flex items-center justify-between border border-orange-300 bg-orange-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                <p className="font-mono text-sm text-orange-700">Running low on usage — {Math.round(pct)}% consumed</p>
              </div>
              <Link href="/onboarding/pricing">
                <button className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                  Upgrade Plan
                </button>
              </Link>
            </div>
          );
        }
        return null;
      })()}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="rounded-none border border-neutral-200 bg-white">
          <TabsTrigger value="config" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Configuration</TabsTrigger>
          <TabsTrigger value="training" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Training</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Integrations</TabsTrigger>
          <TabsTrigger value="escalations" onClick={fetchEscalations} className="rounded-none font-mono text-xs uppercase tracking-wider !text-neutral-500 !bg-white hover:!bg-neutral-100 hover:!text-neutral-900 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white">Chat View</TabsTrigger>
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
          {/* Supervisor Instructions */}
          <Card className="border border-orange-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Supervisor Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs text-neutral-500">
                Standing orders your bot must always follow. These are injected as high-priority instructions into the bot&apos;s system prompt. Use this for rules like &quot;always mention our website&quot;, &quot;never discuss competitors&quot;, &quot;collect feedback after every conversation&quot;, etc.
              </p>
              <Textarea
                placeholder={"e.g.\n- Always end responses by asking if there's anything else you can help with\n- Never discuss token price predictions\n- When someone asks about partnerships, escalate to the team\n- Collect feedback: after helping a user, ask them to rate the experience 1-5"}
                value={supervisorInstructions}
                onChange={(e) => setSupervisorInstructions(e.target.value)}
                className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white min-h-[150px]"
                rows={6}
              />
            </CardContent>
          </Card>

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
                          Your bot is mirroring this style. View to edit or delete individual messages.
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
                    <div className="max-h-[400px] overflow-y-auto space-y-2 border border-green-200 bg-white p-3">
                      {adminMessages.split('---').map((msg, i) => (
                        <div key={i} className="border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-mono text-xs text-neutral-500">Message {i + 1}</p>
                            <div className="flex items-center gap-1">
                              {editingMessageIndex === i ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const msgs = adminMessages.split('---').map((m) => m.trim());
                                      msgs[i] = editingMessageText.trim();
                                      setAdminMessages(msgs.join('\n---\n'));
                                      setEditingMessageIndex(null);
                                      setEditingMessageText('');
                                      setAdminStyleSaved(false);
                                    }}
                                    className="px-2 py-0.5 font-mono text-xs bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setEditingMessageIndex(null); setEditingMessageText(''); }}
                                    className="px-2 py-0.5 font-mono text-xs border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingMessageIndex(i); setEditingMessageText(msg.trim()); }}
                                    className="p-1 text-neutral-400 hover:text-orange-500 transition-colors"
                                    title="Edit message"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const msgs = adminMessages.split('---').map((m) => m.trim()).filter((_, idx) => idx !== i);
                                      if (msgs.length === 0) {
                                        setAdminMessages('');
                                        setShowSavedMessages(false);
                                      } else {
                                        setAdminMessages(msgs.join('\n---\n'));
                                      }
                                      setAdminStyleSaved(false);
                                    }}
                                    className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                                    title="Delete message"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {editingMessageIndex === i ? (
                            <Textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white min-h-[80px]"
                              rows={3}
                            />
                          ) : (
                            <p className="font-mono text-sm text-neutral-700 whitespace-pre-wrap">{msg.trim()}</p>
                          )}
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

              {/* Input mode toggle */}
              {!parsedPreview && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setChatInputMode('upload')}
                      className={`flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider border transition-colors ${
                        chatInputMode === 'upload'
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Export
                    </button>
                    <button
                      onClick={() => setChatInputMode('paste')}
                      className={`flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider border transition-colors ${
                        chatInputMode === 'paste'
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Paste Messages
                    </button>
                  </div>

                  {/* Upload area */}
                  {chatInputMode === 'upload' && !rawChatPaste && (
                    <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                      <Upload className="h-8 w-8 text-neutral-400" />
                      <div className="text-center">
                        <p className="font-mono text-sm font-medium text-neutral-700">Upload Telegram chat export</p>
                        <p className="font-mono text-xs text-neutral-400 mt-1">
                          .txt or .html file from Telegram Desktop → Export Chat History
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".txt,.html,.htm"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* Show loaded file or paste area */}
                  {(chatInputMode === 'paste' || rawChatPaste) && pasteCollapsed && rawChatPaste ? (
                    <div className="border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-none bg-orange-50 p-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-neutral-900">{uploadedFileName || 'chat_export.txt'}</p>
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
                            onClick={() => { setRawChatPaste(''); setPasteCollapsed(false); setUploadedFileName(null); }}
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
                  ) : chatInputMode === 'paste' ? (
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
                  ) : null}

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
                <p className="font-mono text-xs font-medium text-neutral-500">How to get chat messages:</p>
                <p className="font-mono text-xs text-neutral-400">
                  <strong>Upload:</strong> Telegram Desktop → Open chat → &#x2022;&#x2022;&#x2022; → Export Chat History → Format: Plain Text or HTML → Export
                </p>
                <p className="font-mono text-xs text-neutral-400">
                  <strong>Paste:</strong> Mobile/Desktop → Select messages → Copy → Paste here
                </p>
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
                Telegram
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connected state — Bot */}
              {telegramBot && !telegramAccountConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border border-green-200 bg-green-50 p-4">
                    <div>
                      <p className="font-mono text-sm font-medium text-green-700">Telegram bot connected</p>
                      {telegramBot.username !== 'connected' && (
                        <p className="font-mono text-xs text-green-600">@{telegramBot.username}</p>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-700 rounded-none font-mono text-xs">Bot Mode</Badge>
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
              ) : telegramAccountConnected ? (
                /* Connected state — Personal Account */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border border-green-200 bg-green-50 p-4">
                    <div>
                      <p className="font-mono text-sm font-medium text-green-700">Personal account connected</p>
                      <p className="font-mono text-xs text-green-600">{telegramAccountPhone}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 rounded-none font-mono text-xs">Personal Account</Badge>
                  </div>
                  <button
                    onClick={handleDisconnectAccount}
                    disabled={accountLoading}
                    className="flex items-center gap-2 px-3 py-2 font-mono text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {accountLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Disconnect Account
                  </button>
                </div>
              ) : (
                /* Not connected — Mode selection + setup */
                <div className="space-y-4">
                  <p className="font-mono text-sm text-neutral-500">
                    Connect Telegram to let your agent manage your community.
                  </p>
                  {agent.plan === 'starter' && discordConnected && (
                    <div className="border border-orange-300 bg-orange-50 p-3">
                      <p className="font-mono text-xs text-orange-700">
                        Starter plan supports one channel only. Disconnect Discord first, or <a href="/onboarding/pricing" className="underline font-medium">upgrade to Pro</a> for multi-channel deployment.
                      </p>
                    </div>
                  )}

                  {/* Mode selector tabs */}
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
                    /* Bot mode — existing flow */
                    <div className="space-y-4">
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
                          Steps: 1. Open Telegram &rarr; @BotFather &rarr; /newbot &rarr; 2. Copy the token &rarr; 3. Paste here &rarr; 4. Add the bot to your group as admin
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Personal Account mode — auth flow */
                    <div className="space-y-4">
                      <div className="border border-amber-200 bg-amber-50 p-3">
                        <p className="font-mono text-xs text-amber-700">
                          <strong>Disclaimer:</strong> Personal account automation may violate Telegram&apos;s Terms of Service. By proceeding, you acknowledge this risk and accept full responsibility. Humuter is not liable for any account restrictions.
                        </p>
                      </div>

                      {accountAuthStep === 'phone' && (
                        <div className="space-y-3">
                          <div>
                            <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                              Phone Number (with country code)
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type="tel"
                                placeholder="+1234567890"
                                value={accountPhone}
                                onChange={(e) => setAccountPhone(e.target.value)}
                                className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                              />
                              <button
                                onClick={handleSendCode}
                                disabled={accountLoading || !accountPhone.trim()}
                                className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                              >
                                {accountLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Send Code
                              </button>
                            </div>
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
                          <div>
                            <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                              Verification Code
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="Enter code"
                                value={accountCode}
                                onChange={(e) => setAccountCode(e.target.value)}
                                className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                              />
                              <button
                                onClick={handleVerifyCode}
                                disabled={accountLoading || !accountCode.trim()}
                                className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                              >
                                {accountLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Verify
                              </button>
                            </div>
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
                              Two-factor authentication is enabled on this account. Enter your 2FA password.
                            </p>
                          </div>
                          <div>
                            <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                              2FA Password
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type="password"
                                placeholder="Enter your 2FA password"
                                value={accountPassword}
                                onChange={(e) => setAccountPassword(e.target.value)}
                                className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                              />
                              <button
                                onClick={handleSubmit2FA}
                                disabled={accountLoading || !accountPassword.trim()}
                                className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                              >
                                {accountLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Submit
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reporting Human */}
          {(telegramBot || telegramAccountConnected) && (
            <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                  <User className="h-5 w-5 text-orange-500" />
                  Reporting Human (Supervisor)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-mono text-xs text-neutral-500">
                  Configure a human team member who receives questions the bot can&apos;t answer. The bot will forward unanswered questions via Telegram DM.
                </p>
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                    Telegram User ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="e.g. 123456789"
                      value={reportingHumanId}
                      onChange={(e) => setReportingHumanId(e.target.value)}
                      className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                    />
                    <button
                      onClick={handleSaveReportingHuman}
                      disabled={savingReportingHuman}
                      className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {savingReportingHuman ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save
                    </button>
                  </div>
                </div>
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <p className="font-mono text-xs text-neutral-400">
                    How to find your Telegram User ID: Message @userinfobot on Telegram. The reporting human must send /start to your bot first.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Allowed Groups */}
          {(telegramBot || telegramAccountConnected) && (
            <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Allowed Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-mono text-xs text-neutral-500">
                  Restrict which Telegram groups your bot responds in. If no groups are added, the bot will respond in any group it&apos;s added to. When groups are specified, the bot only responds in those groups and in DMs from the supervisor.
                </p>
                {allowedGroupIds.length > 0 && (
                  <div className="space-y-2">
                    {allowedGroupIds.map((id) => (
                      <div key={id} className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
                        <span className="font-mono text-sm text-neutral-700">{id}</span>
                        <button
                          onClick={() => handleRemoveGroupId(id)}
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
                    type="text"
                    placeholder="e.g. -1001234567890"
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                  />
                  <button
                    onClick={handleAddGroupId}
                    disabled={!newGroupId.trim()}
                    className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
                <button
                  onClick={handleSaveAllowedGroups}
                  disabled={savingGroups}
                  className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {savingGroups ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <p className="font-mono text-xs text-neutral-400">
                    How to find your group ID: Add @userinfobot to your group, it will show the group&apos;s chat ID (usually starts with -100). Or check the bot logs for the chat ID when the bot receives a message.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Context */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                <Globe className="h-5 w-5 text-green-500" />
                Social Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs text-neutral-500">
                Link your Twitter/X and website so the bot stays up-to-date with your latest activity.
              </p>
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                  Twitter/X Handle
                </label>
                <Input
                  placeholder="@yourhandle"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                  className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                  Website URL
                </label>
                <Input
                  placeholder="https://yourproject.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSocials}
                  disabled={savingSocials}
                  className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {savingSocials ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <button
                  onClick={handleFetchSocialsNow}
                  disabled={fetchingSocials}
                  className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  {fetchingSocials ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Fetch Now
                </button>
              </div>
              {agent.social_context && (
                <div className="border border-green-200 bg-green-50 p-3">
                  <p className="font-mono text-xs text-green-700 mb-2">Social context loaded ({agent.social_context.length} chars)</p>
                  <pre className="font-mono text-xs text-neutral-500 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {agent.social_context.substring(0, 1000)}
                    {agent.social_context.length > 1000 ? '...' : ''}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord Bot */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                <MessageSquare className="h-5 w-5 text-indigo-500" />
                Discord Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {discordConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border border-green-200 bg-green-50 p-4">
                    <div>
                      <p className="font-mono text-sm font-medium text-green-700">Discord server connected</p>
                      <p className="font-mono text-xs text-green-600">Server ID: {discordServerId}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 rounded-none font-mono text-xs">Connected</Badge>
                  </div>
                  <div className="border border-indigo-200 bg-indigo-50 p-3">
                    <p className="font-mono text-xs text-indigo-700">
                      <strong>Rename the bot in your server:</strong> Right-click the bot in your member list → Change Nickname → enter your project name (e.g. &quot;LayerEdge Assistant&quot;). This only changes it in your server.
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnectDiscord}
                    disabled={discordLoading}
                    className="flex items-center gap-2 px-3 py-2 font-mono text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {discordLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Disconnect Discord
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-mono text-sm text-neutral-500">
                    Connect the Humuter Discord bot to let your agent manage your Discord server.
                  </p>
                  {agent.plan === 'starter' && (telegramBot || telegramAccountConnected) && (
                    <div className="border border-orange-300 bg-orange-50 p-3">
                      <p className="font-mono text-xs text-orange-700">
                        Starter plan supports one channel only. Disconnect Telegram first, or <a href="/onboarding/pricing" className="underline font-medium">upgrade to Pro</a> for multi-channel deployment.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                        Step 1: Add bot to your server
                      </label>
                      <a
                        href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID'}&permissions=397284550720&scope=bot`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Invite Humuter Bot
                      </a>
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                        Step 2: Enter your Discord Server ID
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="e.g. 1234567890123456789"
                          value={discordServerId}
                          onChange={(e) => setDiscordServerId(e.target.value)}
                          className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                        />
                        <button
                          onClick={handleConnectDiscord}
                          disabled={discordLoading || !discordServerId.trim()}
                          className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {discordLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="border border-neutral-200 bg-neutral-50 p-3">
                    <p className="font-mono text-xs text-neutral-400">
                      How to find your Server ID: Enable Developer Mode in Discord (Settings → Advanced → Developer Mode) → Right-click your server → Copy Server ID
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord Supervisor */}
          {discordConnected && (
            <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                  <User className="h-5 w-5 text-indigo-500" />
                  Discord Supervisor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-mono text-xs text-neutral-500">
                  Configure a Discord user who receives questions the bot can&apos;t answer. The bot will forward unanswered questions via Discord DM.
                </p>
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-1 block">
                    Discord User ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. 1234567890123456789"
                      value={discordSupervisorId}
                      onChange={(e) => setDiscordSupervisorId(e.target.value)}
                      className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                    />
                    <button
                      onClick={handleSaveDiscordSupervisor}
                      disabled={savingDiscordSupervisor}
                      className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {savingDiscordSupervisor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save
                    </button>
                  </div>
                </div>
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <p className="font-mono text-xs text-neutral-400">
                    How to find your Discord User ID: Enable Developer Mode → Right-click your username → Copy User ID
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discord Allowed Channels */}
          {discordConnected && (
            <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  Discord Allowed Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-mono text-xs text-neutral-500">
                  Restrict which Discord channels your bot responds in. If no channels are added, the bot will respond in all text channels.
                </p>
                {discordAllowedChannels.length > 0 && (
                  <div className="space-y-2">
                    {discordAllowedChannels.map((id) => (
                      <div key={id} className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
                        <span className="font-mono text-sm text-neutral-700">{id}</span>
                        <button
                          onClick={() => handleRemoveDiscordChannel(id)}
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
                    type="text"
                    placeholder="e.g. 1234567890123456789"
                    value={newDiscordChannelId}
                    onChange={(e) => setNewDiscordChannelId(e.target.value)}
                    className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                  />
                  <button
                    onClick={handleAddDiscordChannel}
                    disabled={!newDiscordChannelId.trim()}
                    className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
                <button
                  onClick={handleSaveDiscordChannels}
                  disabled={savingDiscordChannels}
                  className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {savingDiscordChannels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <p className="font-mono text-xs text-neutral-400">
                    How to find a Channel ID: Enable Developer Mode → Right-click the channel → Copy Channel ID
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chat View Tab — Escalation History */}
        <TabsContent value="escalations" className="mt-6 space-y-6">
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-base font-bold text-neutral-900">Escalation History</CardTitle>
              <button
                onClick={fetchEscalations}
                className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Refresh
              </button>
            </CardHeader>
            <CardContent>
              {escalationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                </div>
              ) : escalations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-neutral-300 mb-3" />
                  <p className="font-mono text-sm text-neutral-500">No escalations yet</p>
                  <p className="font-mono text-xs text-neutral-400 mt-1">
                    Questions the bot can&apos;t answer will appear here once a reporting human is configured.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {escalations.map((esc) => (
                    <div key={esc.id} className="border border-neutral-200 p-4 space-y-3">
                      {/* User question */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-medium text-neutral-700">{esc.user_name || 'User'}</span>
                          <span className="font-mono text-xs text-neutral-400">{new Date(esc.created_at).toLocaleString()}</span>
                        </div>
                        <div className="bg-neutral-50 border border-neutral-200 p-3">
                          <p className="font-mono text-sm text-neutral-900">{esc.user_question}</p>
                        </div>
                      </div>
                      {/* Admin reply or pending */}
                      {esc.admin_reply ? (
                        <div className="flex justify-end">
                          <div className="max-w-[80%]">
                            <div className="flex items-center gap-2 mb-1 justify-end">
                              <span className="font-mono text-xs text-neutral-400">{esc.resolved_at ? new Date(esc.resolved_at).toLocaleString() : ''}</span>
                              <span className="font-mono text-xs font-medium text-orange-600">Admin</span>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 p-3">
                              <p className="font-mono text-sm text-neutral-900">{esc.admin_reply}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Badge className="bg-amber-100 text-amber-700 rounded-none font-mono text-xs">Pending</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                const tokensUsed = agent.tokens_used ?? 0;
                const messagesUsed = agent.messages_handled ?? 0;
                const tokenLimit = TOKEN_LIMITS[agent.plan] || TOKEN_LIMITS.free;
                const pct = Math.min((tokensUsed / tokenLimit) * 100, 100);
                const isHigh = pct >= 70;
                const isExhausted = pct >= 100;

                // Estimate messages: use actual avg if available, else 600 tokens/msg
                const avgTokensPerMsg = messagesUsed > 0 ? Math.round(tokensUsed / messagesUsed) : 600;
                const tokensRemaining = Math.max(tokenLimit - tokensUsed, 0);
                const estimatedRemaining = avgTokensPerMsg > 0 ? Math.floor(tokensRemaining / avgTokensPerMsg) : 0;

                return (
                  <>
                    {/* Token usage bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm text-neutral-600">Token usage</p>
                        <p className="font-mono text-sm font-bold text-neutral-900">
                          {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-full bg-neutral-100 h-3 rounded-none">
                        <div
                          className={`h-3 rounded-none transition-all ${isExhausted ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-neutral-400">
                          {messagesUsed.toLocaleString()} messages sent · ~{estimatedRemaining.toLocaleString()} remaining
                        </p>
                        <p className={`font-mono text-xs ${isExhausted ? 'text-red-500 font-medium' : isHigh ? 'text-orange-500 font-medium' : 'text-neutral-400'}`}>
                          {pct.toFixed(0)}% used
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-neutral-400 capitalize">{agent.plan} plan — monthly</p>
                      {avgTokensPerMsg > 0 && messagesUsed > 0 && (
                        <p className="font-mono text-xs text-neutral-400">~{avgTokensPerMsg} tokens/msg avg</p>
                      )}
                    </div>

                    {/* Exhausted */}
                    {isExhausted && (
                      <div className="flex items-center justify-between border border-red-300 bg-red-50 p-4">
                        <div>
                          <p className="font-mono text-sm font-medium text-red-700">Usage limit reached</p>
                          <p className="font-mono text-xs text-red-500 mt-0.5">Your agent has stopped responding to messages.</p>
                        </div>
                        <Link href="/onboarding/pricing">
                          <button className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-colors">
                            <ArrowUpRight className="h-4 w-4" />
                            Upgrade Now
                          </button>
                        </Link>
                      </div>
                    )}

                    {/* Approaching limit */}
                    {isHigh && !isExhausted && (
                      <div className="flex items-center justify-between border border-orange-200 bg-orange-50 p-4">
                        <p className="font-mono text-xs text-orange-700">
                          You&apos;re approaching your plan limit. Upgrade to avoid interruption.
                        </p>
                        <Link href="/onboarding/pricing">
                          <button className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors shrink-0 ml-4">
                            Upgrade Plan
                          </button>
                        </Link>
                      </div>
                    )}

                    {/* Free plan — always show upgrade */}
                    {agent.plan === 'free' && !isHigh && (
                      <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 p-3">
                        <p className="font-mono text-xs text-neutral-500">Get more messages with a paid plan</p>
                        <Link href="/onboarding/pricing" className="font-mono text-xs text-orange-500 hover:text-orange-600 font-medium">
                          Upgrade to Starter →
                        </Link>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Plan & Billing */}
          <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="font-mono text-sm font-bold text-neutral-900">Current Plan</p>
                <p className="font-mono text-xs text-neutral-500 mt-1 capitalize">{agent.plan} plan</p>
              </div>
              <Link href="/onboarding/pricing">
                <button className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                  Change Plan
                </button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
