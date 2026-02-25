export const AGENT_TYPES = [
  {
    id: 'community_manager',
    name: 'Telegram Community Manager',
    description: 'Manages your Telegram community, answers questions, moderates discussions, and keeps engagement high.',
    icon: 'Users',
    features: ['24/7 community moderation', 'FAQ auto-responses', 'Engagement analytics', 'Telegram integration'],
    live: true,
  },
  {
    id: 'kol',
    name: 'In-house Project KOL',
    description: 'Acts as your project ambassador, creates educational content, and builds thought leadership.',
    icon: 'Megaphone',
    features: ['Content generation', 'Community education', 'Brand voice consistency', 'Thread creation'],
    live: false,
  },
  {
    id: 'customer_service',
    name: 'Customer Service',
    description: 'Handles support tickets, troubleshoots issues, and provides technical assistance.',
    icon: 'Headphones',
    features: ['Ticket management', 'Technical troubleshooting', 'Escalation routing', 'Response templates'],
    live: false,
  },
  {
    id: 'protocol_onboarding',
    name: 'Protocol Onboarding',
    description: 'Guides new users through your protocol, explains features, and helps with first transactions.',
    icon: 'Rocket',
    features: ['Step-by-step guides', 'Wallet setup help', 'Transaction walkthroughs', 'FAQ handling'],
    live: false,
  },
  {
    id: 'other',
    name: 'Custom Agent',
    description: 'Define your own agent type with a custom role and responsibilities.',
    icon: 'Sparkles',
    features: ['Fully customizable', 'Define your own role', 'Custom training', 'Flexible deployment'],
    live: false,
  },
] as const;

export type AgentTypeId = (typeof AGENT_TYPES)[number]['id'];
