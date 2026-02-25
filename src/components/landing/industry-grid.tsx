'use client';

import Link from 'next/link';
import { INDUSTRIES } from '@/lib/constants/industries';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

export function IndustryGrid() {
  const setIndustry = useOnboardingStore((s) => s.setIndustry);

  return (
    <section id="agents" className="border-b border-neutral-200">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left label */}
          <div className="border-b border-neutral-200 p-8 md:col-span-4 md:border-b-0 md:border-r md:p-12">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 bg-neutral-900" />
              <span className="font-mono text-lg font-bold text-neutral-900">
                Choose Your Industry
              </span>
            </div>
            <p className="font-mono text-sm text-neutral-500">
              Select your industry to get a tailored AI agent for your specific needs.
            </p>
          </div>

          {/* Industry cards */}
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {INDUSTRIES.map((industry) => {
                const inner = (
                  <div
                    key={industry.id}
                    className={`group relative border-b border-r border-neutral-200 p-8 transition-colors ${
                      industry.available
                        ? 'cursor-pointer hover:bg-orange-50'
                        : 'cursor-not-allowed'
                    }`}
                  >
                    {/* Corner brackets */}
                    <div className="absolute top-3 left-3 h-4 w-4 border-t border-l border-neutral-300" />
                    <div className="absolute top-3 right-3 h-4 w-4 border-t border-r border-neutral-300" />
                    <div className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-neutral-300" />
                    <div className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-neutral-300" />

                    <div className="flex items-center gap-3">
                      {industry.available && (
                        <div className="h-2 w-2 bg-orange-500" />
                      )}
                      <span
                        className={`font-mono text-base font-medium ${
                          industry.available ? 'text-neutral-900' : 'text-neutral-400'
                        }`}
                      >
                        {industry.name}
                      </span>
                    </div>
                    <p
                      className={`mt-2 font-mono text-xs ${
                        industry.available ? 'text-neutral-500' : 'text-neutral-300'
                      }`}
                    >
                      {industry.description}
                    </p>
                    {!industry.available && (
                      <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-neutral-300">
                        COMING SOON
                      </span>
                    )}
                    {industry.available && (
                      <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-orange-500 opacity-0 transition-opacity group-hover:opacity-100">
                        SELECT &rarr;
                      </span>
                    )}
                  </div>
                );

                if (industry.available) {
                  return (
                    <Link
                      key={industry.id}
                      href="/onboarding/agents"
                      onClick={() => setIndustry(industry.id)}
                    >
                      {inner}
                    </Link>
                  );
                }
                return <div key={industry.id}>{inner}</div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
