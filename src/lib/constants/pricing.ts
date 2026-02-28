export type BillingCycle = 'monthly' | 'annual';

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice?: number;
  chargePrice?: number;
  description: string;
  features: string[];
  notIncluded: string[];
  popular: boolean;
  badge?: string;
  isContactSales?: boolean;
  tokenLimit: number;
  estimatedMessages: number;
  maxSlots?: number | null;
  waitlistOnly?: boolean;
}

export const ANNUAL_DISCOUNT = 0.28; // ~28% off ($179 → $129)

// Token limits per plan — used by webhook/cron for enforcement
export const TOKEN_LIMITS: Record<string, number> = {
  free: 10000,
  starter: 900000,
  pro: 3000000,
  enterprise: 100000000,
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    description: 'Try it out',
    tokenLimit: 10000,
    estimatedMessages: 15,
    features: [
      '1 AI Agent',
      '1 channel (Telegram)',
      '~15 messages/month',
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
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 179,
    annualMonthlyPrice: 129,
    description: 'Perfect for small communities',
    tokenLimit: 900000,
    estimatedMessages: 1500,
    maxSlots: 20,
    features: [
      '1 AI Agent',
      '2 channels (Telegram + Discord)',
      'Up to ~1,500 messages/month',
      '1 reporting human (supervisor)',
      'Custom training uploads',
      'Priority support',
      'Basic analytics',
    ],
    notIncluded: [
      'Multiple supervisors',
      'Advanced analytics',
    ],
    popular: true,
    badge: '7-Day Free Trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 349,
    description: 'For growing projects',
    tokenLimit: 3000000,
    estimatedMessages: 5000,
    waitlistOnly: true,
    features: [
      'Everything in Starter, plus:',
      '3 channels (Telegram + Discord + Widget)',
      'Up to ~5,000 messages/month',
      '3+ supervisors',
      'Advanced analytics',
      'skill.md upload',
    ],
    notIncluded: [
      'Multiple AI agents',
      'Dedicated account manager',
    ],
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    description: 'For established protocols',
    tokenLimit: 100000000,
    estimatedMessages: 10000,
    features: [
      'Everything in Pro, plus:',
      'Multiple AI Agents',
      '5+ channels',
      '10,000+ messages/month',
      'Full analytics suite',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    notIncluded: [],
    popular: false,
    isContactSales: true,
  },
];

export function getDisplayPrice(tier: PricingTier, cycle: BillingCycle): number {
  if (tier.isContactSales) return 0;
  if (cycle === 'annual' && tier.annualMonthlyPrice) {
    return tier.annualMonthlyPrice;
  }
  if (cycle === 'annual') {
    return Math.round(tier.monthlyPrice * (1 - ANNUAL_DISCOUNT));
  }
  return tier.monthlyPrice;
}

export function getTotalPrice(tier: PricingTier, cycle: BillingCycle): number {
  if (tier.isContactSales) return 0;
  if (cycle === 'annual') {
    const monthly = tier.annualMonthlyPrice || Math.round(tier.monthlyPrice * (1 - ANNUAL_DISCOUNT));
    return monthly * 12;
  }
  return tier.monthlyPrice;
}

export function getChargeAmount(tier: PricingTier, cycle: BillingCycle): number {
  if (tier.chargePrice !== undefined) return tier.chargePrice;
  return getTotalPrice(tier, cycle);
}

export type PlanId = (typeof PRICING_TIERS)[number]['id'];
