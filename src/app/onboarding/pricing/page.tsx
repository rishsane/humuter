'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { PRICING_TIERS, getDisplayPrice, getTotalPrice } from '@/lib/constants/pricing';
import type { BillingCycle } from '@/lib/constants/pricing';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { Check, X, ArrowRight, ArrowLeft, Calendar, Loader2, CheckCircle, Mail, CreditCard, Clock } from 'lucide-react';

const CAL_URL = 'https://cal.com/humuter/enterprise';

interface SlotData {
  starter: { used: number; total: number };
  pro: { used: number; total: number; waitlistOnly: boolean };
}

export default function PricingPage() {
  const router = useRouter();
  const { plan, billingCycle, setPlan, setBillingCycle, goToStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(plan);
  const [cycle, setCycle] = useState<BillingCycle>(billingCycle);
  const [slots, setSlots] = useState<SlotData | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistPlan, setWaitlistPlan] = useState<string | null>(null);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState<string | null>(null);
  const [showTrialChoice, setShowTrialChoice] = useState(false);

  useEffect(() => {
    fetch('/api/slots')
      .then((r) => r.json())
      .then((d) => setSlots(d))
      .catch(() => {});
  }, []);

  const starterAvailable = slots ? slots.starter.total - slots.starter.used : 20;
  const starterFull = starterAvailable <= 0;

  const handleSelect = (id: string) => {
    if (id === 'enterprise') return;
    if (id === 'pro') return; // waitlist only
    if (id === 'starter' && starterFull) return; // no slots
    setSelected(id);
    setPlan(id as 'free' | 'starter' | 'pro' | 'enterprise');
  };

  const handleCycleChange = (c: BillingCycle) => {
    setCycle(c);
    setBillingCycle(c);
  };

  const handleContinue = () => {
    if (!selected) return;
    if (selected === 'starter') {
      setShowTrialChoice(true);
    } else if (selected === 'free') {
      goToStep(4);
      router.push('/onboarding/training');
    } else {
      goToStep(3);
      router.push('/onboarding/payment');
    }
  };

  const handleBack = () => {
    goToStep(1);
    router.push('/onboarding/agents');
  };

  const handleJoinWaitlist = async (planId: string) => {
    if (!waitlistEmail.trim() || !waitlistEmail.includes('@')) return;
    setWaitlistSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail, plan: planId }),
      });
      if (res.ok) {
        setWaitlistDone(planId);
        setWaitlistEmail('');
      }
    } catch {
      // silent
    } finally {
      setWaitlistSubmitting(false);
    }
  };

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
            Save 28%
          </Badge>
        </button>
      </div>

      {(() => {
        const displayTiers = PRICING_TIERS.filter(t => t.id !== 'free');
        return (
      <div className="grid grid-cols-1 gap-0 border border-neutral-200 md:grid-cols-3">
        {displayTiers.map((tier, index) => {
          const perMonth = getDisplayPrice(tier, cycle);
          const total = getTotalPrice(tier, cycle);
          const isAnnual = cycle === 'annual';
          const isEnterprise = tier.isContactSales;
          const isPro = tier.id === 'pro';
          const isStarter = tier.id === 'starter';
          const isLocked = isEnterprise || isPro || (isStarter && starterFull);
          const showWaitlist = (isPro || (isStarter && starterFull));

          return (
            <Card
              key={tier.id}
              onClick={() => !isLocked && handleSelect(tier.id)}
              className={`relative border-0 rounded-none transition-all duration-200 ${
                index < displayTiers.length - 1 ? 'md:border-r md:border-neutral-200' : ''
              } ${isLocked ? 'cursor-default' : 'cursor-pointer'} ${
                selected === tier.id
                  ? 'bg-orange-50 ring-2 ring-inset ring-orange-500'
                  : 'bg-white hover:bg-neutral-50'
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white font-mono uppercase text-xs rounded-none z-10">
                  Best Value
                </Badge>
              )}
              <CardHeader className="pb-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">{tier.name}</CardTitle>
                  {/* Slot badges */}
                  {isStarter && slots && (
                    <Badge className={`font-mono text-xs rounded-none border-0 ${
                      starterFull ? 'bg-red-100 text-red-600' :
                      starterAvailable <= 5 ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {starterFull ? 'Sold Out' : `${starterAvailable}/20 Slots`}
                    </Badge>
                  )}
                  {isPro && (
                    <Badge className="font-mono text-xs rounded-none border-0 bg-neutral-200 text-neutral-500">
                      No Slots Available
                    </Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-neutral-400">{tier.description}</p>
                <div className="mt-4">
                  {isEnterprise ? (
                    <div>
                      <span className="font-mono text-2xl font-bold text-neutral-900">Custom</span>
                      <p className="font-mono text-xs text-neutral-400 mt-1">Tailored to your needs</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-4xl font-bold text-neutral-900">{perMonth === 0 ? 'Free' : `$${perMonth}`}</span>
                        {perMonth > 0 && <span className="font-mono text-sm text-neutral-400">/month</span>}
                      </div>
                      {isAnnual && tier.monthlyPrice > 0 && (
                        <div className="mt-1 space-y-0.5">
                          <p className="font-mono text-xs text-neutral-400 line-through">${tier.monthlyPrice}/mo</p>
                          <p className="font-mono text-xs text-green-600 font-medium">
                            ${total} billed annually — save ${tier.monthlyPrice * 12 - total}/yr
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {tier.badge && !starterFull && (
                  <Badge className="mt-2 bg-green-100 text-green-700 font-mono text-xs rounded-none border-0">
                    {tier.badge}
                  </Badge>
                )}
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

                {/* Starter: Start Free Trial button */}
                {isStarter && !starterFull && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlan('starter');
                      goToStep(4);
                      router.push('/onboarding/training');
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 font-mono text-sm uppercase tracking-wider bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    Start 7-Day Free Trial
                  </button>
                )}

                {/* Enterprise: Book a Call */}
                {isEnterprise && (
                  <a
                    href={CAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 font-mono text-sm uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calendar className="h-4 w-4" />
                    Book a Call
                  </a>
                )}

                {/* Waitlist form for Pro and sold-out Starter */}
                {showWaitlist && (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {waitlistDone === tier.id ? (
                      <div className="flex items-center gap-2 p-3 border border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <p className="font-mono text-xs text-green-700">You&apos;re on the list! We&apos;ll notify you when a slot opens.</p>
                      </div>
                    ) : waitlistPlan === tier.id ? (
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          className="font-mono text-sm rounded-none border-neutral-200 text-neutral-900 bg-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleJoinWaitlist(tier.id)}
                            disabled={waitlistSubmitting || !waitlistEmail.includes('@')}
                            className="flex-1 flex items-center justify-center gap-2 py-2 font-mono text-xs uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                          >
                            {waitlistSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                            Submit
                          </button>
                          <button
                            onClick={() => setWaitlistPlan(null)}
                            className="px-3 py-2 font-mono text-xs uppercase tracking-wider border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWaitlistPlan(tier.id)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 font-mono text-sm uppercase tracking-wider border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        Join Waitlist
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
        );
      })()}

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="rounded-none border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-mono uppercase tracking-wider"
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
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Trial vs Subscribe modal */}
      {showTrialChoice && (() => {
        const starterTier = PRICING_TIERS.find(t => t.id === 'starter')!;
        const price = getDisplayPrice(starterTier, cycle);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-3xl bg-white border border-neutral-200 shadow-xl">
              <button
                onClick={() => setShowTrialChoice(false)}
                className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-8 text-center border-b border-neutral-200">
                <h2 className="font-mono text-2xl font-bold text-neutral-900">How would you like to start?</h2>
                <p className="mt-2 font-mono text-sm text-neutral-500">Choose how to get started with the Starter plan</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Free Trial */}
                <div className="p-8 space-y-6 border-b md:border-b-0 md:border-r border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="rounded-none bg-green-50 p-2.5">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-mono text-lg font-bold text-neutral-900">7-Day Free Trial</h3>
                      <p className="font-mono text-xs text-green-600 font-medium">No credit card required</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm text-neutral-500">
                    Try Starter free for 7 days. Your agent will pause after the trial unless you subscribe.
                  </p>
                  <div className="space-y-2">
                    {starterTier.features.map((feature) => (
                      <div key={feature} className="flex items-center font-mono text-sm">
                        <Check className="mr-2 h-3.5 w-3.5 shrink-0 text-green-500" />
                        <span className="text-neutral-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      goToStep(4);
                      router.push('/onboarding/training');
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 font-mono text-sm uppercase tracking-wider bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    Start Free Trial
                  </button>
                </div>

                {/* Subscribe */}
                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-none bg-orange-50 p-2.5">
                      <CreditCard className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-mono text-lg font-bold text-neutral-900">Subscribe Now</h3>
                      <p className="font-mono text-xs text-orange-500 font-medium">Full access immediately</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm text-neutral-500">
                    Get full access right away. Cancel anytime.
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold text-neutral-900">${price}</span>
                    <span className="font-mono text-sm text-neutral-400">/month</span>
                  </div>
                  {cycle === 'annual' && (
                    <p className="font-mono text-xs text-green-600 font-medium">
                      Billed annually — save 28%
                    </p>
                  )}
                  <div className="space-y-2">
                    {starterTier.features.map((feature) => (
                      <div key={feature} className="flex items-center font-mono text-sm">
                        <Check className="mr-2 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span className="text-neutral-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      goToStep(3);
                      router.push('/onboarding/payment');
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 font-mono text-sm uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscribe — ${price}/mo
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
