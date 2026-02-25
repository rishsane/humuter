'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { AGENT_TYPES } from '@/lib/constants/agent-types';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

export default function AgentSelectionPage() {
  const router = useRouter();
  const { agentType, setAgentType, customAgentDescription, setCustomAgentDescription, setIndustry, goToStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(agentType);

  const handleSelect = (id: string) => {
    const type = AGENT_TYPES.find((t) => t.id === id);
    if (!type?.live) return;
    setSelected(id);
    setAgentType(id);
    setIndustry('blockchain');
  };

  const handleContinue = () => {
    if (!selected) return;
    if (selected === 'other' && !customAgentDescription.trim()) return;
    goToStep(2);
    router.push('/onboarding/pricing');
  };

  return (
    <div className="space-y-8">
      <ProgressSteps currentStep={1} />

      <div className="text-center">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-neutral-900">CHOOSE YOUR AGENT TYPE</h1>
        <p className="mt-2 font-mono text-sm text-neutral-500">
          Select the type of AI agent you want to deploy for your blockchain project
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGENT_TYPES.map((type) => {
          const isLive = type.live;
          return (
            <Card
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`relative border transition-all duration-200 rounded-none ${
                !isLive
                  ? 'cursor-not-allowed opacity-50 border-neutral-200 bg-neutral-50'
                  : selected === type.id
                    ? 'cursor-pointer border-orange-500 bg-orange-50'
                    : 'cursor-pointer border-neutral-200 bg-white hover:bg-orange-50'
              }`}
            >
              {/* Corner bracket decorations */}
              <div className={`absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 ${selected === type.id && isLive ? 'border-orange-500' : 'border-neutral-300'}`} />
              <div className={`absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 ${selected === type.id && isLive ? 'border-orange-500' : 'border-neutral-300'}`} />
              <div className={`absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 ${selected === type.id && isLive ? 'border-orange-500' : 'border-neutral-300'}`} />
              <div className={`absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 ${selected === type.id && isLive ? 'border-orange-500' : 'border-neutral-300'}`} />

              {!isLive && (
                <Badge className="absolute top-3 right-3 bg-neutral-200 text-neutral-500 font-mono uppercase text-xs rounded-none border-0">
                  Coming Soon
                </Badge>
              )}

              <CardContent className="p-6">
                <div
                  className={`mb-4 inline-flex h-8 w-8 items-center justify-center rounded-none ${
                    selected === type.id && isLive
                      ? 'bg-orange-500'
                      : 'bg-neutral-200'
                  }`}
                >
                  <div className={`h-2 w-2 ${selected === type.id && isLive ? 'bg-white' : 'bg-neutral-500'}`} />
                </div>
                <h3 className={`font-mono text-lg font-bold ${isLive ? 'text-neutral-900' : 'text-neutral-400'}`}>{type.name}</h3>
                <p className={`mt-2 font-mono text-sm ${isLive ? 'text-neutral-500' : 'text-neutral-400'}`}>{type.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {type.features.map((feature) => (
                    <li key={feature} className={`flex items-center font-mono text-sm ${isLive ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      <div className={`mr-2 h-1.5 w-1.5 ${isLive ? 'bg-orange-500' : 'bg-neutral-300'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom description input for "other" */}
      {selected === 'other' && (
        <div className="mx-auto max-w-lg space-y-2">
          <label className="font-mono text-sm uppercase tracking-wider text-neutral-700">
            Describe your custom agent role
          </label>
          <Textarea
            placeholder="I need an agent that..."
            value={customAgentDescription}
            onChange={(e) => setCustomAgentDescription(e.target.value)}
            className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400"
            rows={3}
          />
        </div>
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={!selected || (selected === 'other' && !customAgentDescription.trim())}
          size="lg"
          className="rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600 font-mono uppercase tracking-wider disabled:opacity-50"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
