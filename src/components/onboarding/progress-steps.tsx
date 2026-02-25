'use client';

import { Check } from 'lucide-react';

const steps = [
  { number: 1, label: 'Agent Type' },
  { number: 2, label: 'Plan' },
  { number: 3, label: 'Payment' },
  { number: 4, label: 'Training' },
  { number: 5, label: 'Deploy' },
];

interface ProgressStepsProps {
  currentStep: number;
}

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-none font-mono text-sm font-bold transition-all ${
                step.number < currentStep
                  ? 'bg-neutral-900 text-white'
                  : step.number === currentStep
                  ? 'bg-orange-500 text-white'
                  : 'bg-neutral-200 text-neutral-400'
              }`}
            >
              {step.number < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`hidden font-mono text-xs uppercase tracking-wider sm:block ${
                step.number === currentStep
                  ? 'font-bold text-neutral-900'
                  : step.number < currentStep
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="mx-2 flex items-center gap-1">
              <div
                className={`h-0.5 w-6 ${
                  step.number < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
              <div
                className={`h-1.5 w-1.5 rounded-none ${
                  step.number < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
              <div
                className={`h-0.5 w-6 ${
                  step.number < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
