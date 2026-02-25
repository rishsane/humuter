interface PricingTier {
  id: string;
  name: string;
  price: number;
  chargePrice?: number;
  description: string;
  features: string[];
  notIncluded: string[];
  popular: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    chargePrice: 1,
    description: 'Perfect for small communities',
    features: [
      '1 AI Agent',
      '1 channel (Telegram OR Discord)',
      '5,000 messages/month',
      'Basic analytics',
      'Email support',
    ],
    notIncluded: [
      'Multi-channel deployment',
      'Custom training uploads',
      'Priority support',
      'Advanced analytics',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    description: 'For growing projects',
    features: [
      '1 AI Agent',
      '3 channels (Telegram + Discord + Widget)',
      '25,000 messages/month',
      'Advanced analytics',
      'skill.md upload',
      'Priority support',
      'Custom tone training',
    ],
    notIncluded: [
      'Unlimited messages',
      'Dedicated account manager',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    description: 'For established protocols',
    features: [
      '3 AI Agents',
      'Unlimited channels',
      'Unlimited messages',
      'Full analytics suite',
      'skill.md upload',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    notIncluded: [],
    popular: false,
  },
];

export type PlanId = (typeof PRICING_TIERS)[number]['id'];
