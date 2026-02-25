'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { PRICING_TIERS, ANNUAL_DISCOUNT, getDisplayPrice, getTotalPrice } from '@/lib/constants/pricing';
import type { BillingCycle } from '@/lib/constants/pricing';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { Check, X, ArrowRight, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const { plan, billingCycle, setPlan, setBillingCycle, goToStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(plan);
  const [cycle, setCycle] = useState<BillingCycle>(billingCycle);

  const handleSelect = (id: string) => {
    setSelected(id);
    setPlan(id as 'starter' | 'pro' | 'enterprise');
  };

  const handleCycleChange = (c: BillingCycle) => {
    setCycle(c);
    setBillingCycle(c);
  };

  const handleContinue = () => {
    if (!selected) return;
    goToStep(3);
    router.push('/onboarding/payment');
  };

  const handleBack = () => {
    goToStep(1);
    router.push('/onboarding/agents');
  };

  const discountPercent = Math.round(ANNUAL_DISCOUNT * 100);

  return (
    <div className="space-y-8">
      <ProgressSteps currentStep={2} />

      <div className="text-center">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-neutral-900">CHOOSE YOUR PLAN</h1>
        <p className="mt-2 font-mono text-sm text-neutral-500">
          Select the plan that best fits your project&apos;s needs
        </p>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handleCycleChange('monthly')}
          className={`px-4 py-2 font-mono text-sm uppercase tracking-wider border transition-colors ${
            cycle === 'monthly'
              ? 'border-orange-500 bg-orange-50 text-orange-600'
              : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => handleCycleChange('annual')}
          className={`px-4 py-2 font-mono text-sm uppercase tracking-wider border transition-colors flex items-center gap-2 ${
            cycle === 'annual'
              ? 'border-orange-500 bg-orange-50 text-orange-600'
              : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
          }`}
        >
          Annual
          <Badge className="bg-green-100 text-green-700 font-mono text-xs rounded-none border-0">
            Save {discountPercent}%
          </Badge>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-0 border border-neutral-200 md:grid-cols-3">
        {PRICING_TIERS.map((tier, index) => {
          const perMonth = getDisplayPrice(tier, cycle);
          const total = getTotalPrice(tier, cycle);
          const isAnnual = cycle === 'annual';

          return (
            <Card
              key={tier.id}
              onClick={() => handleSelect(tier.id)}
              className={`relative cursor-pointer border-0 rounded-none transition-all duration-200 ${
                index < PRICING_TIERS.length - 1 ? 'md:border-r md:border-neutral-200' : ''
              } ${
                selected === tier.id
                  ? 'bg-orange-50 ring-2 ring-inset ring-orange-500'
                  : 'bg-white hover:bg-neutral-50'
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white font-mono uppercase text-xs rounded-none">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="pb-4 border-b border-neutral-200">
                <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">{tier.name}</CardTitle>
                <p className="font-mono text-xs text-neutral-400">{tier.description}</p>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-4xl font-bold text-neutral-900">${perMonth}</span>
                    <span className="font-mono text-sm text-neutral-400">/month</span>
                  </div>
                  {isAnnual && (
                    <div className="mt-1 space-y-0.5">
                      <p className="font-mono text-xs text-neutral-400 line-through">${tier.monthlyPrice}/mo</p>
                      <p className="font-mono text-xs text-green-600 font-medium">
                        ${total} billed annually — save ${tier.monthlyPrice * 12 - total}/yr
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center font-mono text-sm">
                      <Check className="mr-2 h-4 w-4 shrink-0 text-orange-500" />
                      <span className="text-neutral-700">{feature}</span>
                    </div>
                  ))}
                  {tier.notIncluded.map((feature) => (
                    <div key={feature} className="flex items-center font-mono text-sm">
                      <X className="mr-2 h-4 w-4 shrink-0 text-neutral-300" />
                      <span className="text-neutral-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="rounded-none border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selected}
          size="lg"
          className="rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600 font-mono uppercase tracking-wider disabled:opacity-50"
        >
          Continue to Payment
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
