import { AGENT_TYPES } from '@/lib/constants/agent-types';
import { PRICING_TIERS, getDisplayPrice } from '@/lib/constants/pricing';
import type { InlineButton } from './utils';

export type OnboardingStep =
  | 'welcome'
  | 'choose_agent_type'
  | 'choose_plan'
  | 'choose_billing_cycle'
  | 'payment'
  | 'collect_email'
  | 'verify_otp'
  | 'training_questions'
  | 'upload_file'
  | 'collect_bot_token'
  | 'deploy'
  | 'done';

export interface OnboardingSession {
  id: string;
  tg_user_id: number;
  tg_username: string | null;
  step: OnboardingStep;
  agent_type: string | null;
  plan: string | null;
  billing_cycle: 'monthly' | 'annual';
  email: string | null;
  email_otp: string | null;
  email_verified: boolean;
  supabase_user_id: string | null;
  training_data: Record<string, string>;
  current_question_index: number;
  skill_file_content: string | null;
  bot_token: string | null;
  payment_address: string | null;
  payment_amount: number | null;
  payment_tx_hash: string | null;
  payment_verified: boolean;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Message Templates ---

export const WELCOME_MESSAGE = `Welcome to <b>Humuter</b> — deploy AI agents for your crypto community, right from Telegram.

No website needed. Let's get your agent live in minutes.`;

export function getWelcomeKeyboard(): InlineButton[][] {
  return [[{ text: 'Deploy an AI Agent', callback_data: 'start:deploy' }]];
}

export function getAgentTypeMessage(): string {
  return 'What type of agent do you want to deploy?';
}

export function getAgentTypeKeyboard(): InlineButton[][] {
  const liveTypes = AGENT_TYPES.filter((t) => t.live);
  return liveTypes.map((t) => [
    { text: t.name, callback_data: `agent_type:${t.id}` },
  ]);
}

export function getPlanMessage(agentType: string): string {
  const type = AGENT_TYPES.find((t) => t.id === agentType);
  const starter = PRICING_TIERS.find((t) => t.id === 'starter')!;

  return `Great choice! Now pick a plan for your <b>${type?.name || 'Agent'}</b>:

<b>Starter</b> — $${starter.monthlyPrice}/mo
${starter.features.map((f) => `  - ${f}`).join('\n')}

Includes a <b>7-day free trial</b> — no payment required to start.`;
}

export function getPlanKeyboard(): InlineButton[][] {
  return [
    [{ text: 'Starter (7-Day Free Trial)', callback_data: 'plan:starter_trial' }],
    [{ text: 'Starter (Subscribe)', callback_data: 'plan:starter_paid' }],
    [{ text: 'Enterprise (Contact Us)', callback_data: 'plan:enterprise' }],
  ];
}

export function getBillingCycleMessage(): string {
  const starter = PRICING_TIERS.find((t) => t.id === 'starter')!;
  const monthly = getDisplayPrice(starter, 'monthly');
  const annual = getDisplayPrice(starter, 'annual');
  const savePct = Math.round((1 - annual / monthly) * 100);

  return `Choose your billing cycle:

<b>Monthly:</b> $${monthly}/mo
<b>Annual:</b> $${annual}/mo — save ${savePct}%`;
}

export function getBillingCycleKeyboard(): InlineButton[][] {
  const starter = PRICING_TIERS.find((t) => t.id === 'starter')!;
  const monthly = getDisplayPrice(starter, 'monthly');
  const annual = getDisplayPrice(starter, 'annual');

  return [
    [{ text: `Monthly ($${monthly}/mo)`, callback_data: 'billing:monthly' }],
    [{ text: `Annual ($${annual}/mo — save 28%)`, callback_data: 'billing:annual' }],
  ];
}

export function getPaymentMessage(amount: number, address: string): string {
  return `Send <b>${amount} USDC</b> to the following address on <b>Base</b> chain:

<code>${address}</code>

After sending, paste the <b>transaction hash</b> here.`;
}

export const COLLECT_EMAIL_MESSAGE = "What's your email? We'll create your Humuter account so you can manage your agent from the dashboard.";

export function getVerifyOtpMessage(email: string): string {
  return `Enter the 6-digit code sent to <b>${email}</b>.`;
}

export const UPLOAD_FILE_MESSAGE = `Want to upload a skill file (<code>.md</code> or <code>.txt</code>) or a Telegram chat export to train your agent?

Send the file now, or tap Skip.`;

export function getUploadFileKeyboard(): InlineButton[][] {
  return [[{ text: 'Skip', callback_data: 'upload:skip' }]];
}

export const COLLECT_BOT_TOKEN_MESSAGE = `Now let's connect your bot. Follow these steps:

1. Open Telegram and search for <b>@BotFather</b>
2. Send <code>/newbot</code> and follow the prompts
3. Copy the <b>bot token</b> BotFather gives you
4. Paste it here`;

export function getDeploySuccessMessage(botUsername: string, agentId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://humuter.com';
  return `Your agent is live! Here's what to do next:

1. Add <b>@${botUsername}</b> to your Telegram group
2. Make the bot an <b>admin</b>
3. Turn off <b>privacy mode</b> in @BotFather (send <code>/setprivacy</code> → Disable)

Your agent will start responding to messages in the group immediately.

<b>Dashboard:</b> ${appUrl}/dashboard/agents/${agentId}`;
}

export const ENTERPRISE_MESSAGE = `For Enterprise plans, let's schedule a call to discuss your needs.

Book a time here: https://cal.com/humuter/enterprise`;

export const ALREADY_HAS_AGENT_MESSAGE = "You've already deployed an agent. During early access, each account is limited to 1 agent. Visit your dashboard to manage it.";

export function getSkipButton(): InlineButton[][] {
  return [[{ text: 'Skip', callback_data: 'skip' }]];
}
