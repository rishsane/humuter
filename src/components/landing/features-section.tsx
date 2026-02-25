import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function FeaturesSection() {
  return (
    <section className="border-b border-neutral-200">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left — Agent types showcase */}
          <div className="border-r border-neutral-200 md:col-span-5">
            <div className="border-b border-neutral-200 p-8 md:p-12">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-neutral-900" />
                <span className="font-mono text-lg font-bold text-neutral-900">
                  Agent Types
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-neutral-500">
                Pre-built roles for your business
              </p>
            </div>
            {[
              'Community Manager',
              'In-house KOL',
              'Customer Service',
              'Protocol Onboarding',
              'Custom Agent',
            ].map((type) => (
              <div
                key={type}
                className="group relative border-b border-neutral-200 px-8 py-5 transition-colors hover:bg-orange-50"
              >
                {/* Corner brackets */}
                <div className="absolute top-2 left-2 h-3 w-3 border-t border-l border-neutral-200 transition-colors group-hover:border-orange-300" />
                <div className="absolute top-2 right-2 h-3 w-3 border-t border-r border-neutral-200 transition-colors group-hover:border-orange-300" />
                <div className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-neutral-200 transition-colors group-hover:border-orange-300" />
                <div className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-neutral-200 transition-colors group-hover:border-orange-300" />

                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 bg-orange-500" />
                  <span className="font-mono text-sm text-neutral-700">{type}</span>
                </div>
              </div>
            ))}
            <div className="p-8">
              <Link href="/onboarding/agents">
                <Button className="w-full rounded-none bg-orange-500 py-5 font-mono text-sm uppercase tracking-wider text-white hover:bg-orange-600">
                  CHOOSE YOUR AGENT
                </Button>
              </Link>
            </div>
          </div>

          {/* Right — Capabilities */}
          <div className="md:col-span-7">
            <div className="border-b border-neutral-200 p-8 md:p-12">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-neutral-900" />
                <span className="font-mono text-lg font-bold text-neutral-900">
                  Capabilities
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-neutral-500">
                What your agent can do
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {[
                {
                  num: '01',
                  title: 'Multi-Channel',
                  desc: 'Deploy on Telegram, Discord, website widget, and any platform via API.',
                },
                {
                  num: '02',
                  title: 'Custom Training',
                  desc: 'Train with your docs, FAQs, and brand voice. Upload skill.md for advanced control.',
                },
                {
                  num: '03',
                  title: '24/7 Operation',
                  desc: 'Your agent never sleeps. Handles questions, moderates, and onboards around the clock.',
                },
                {
                  num: '04',
                  title: 'Analytics',
                  desc: 'Track messages, response quality, active channels, and user engagement in real time.',
                },
              ].map((cap) => (
                <div
                  key={cap.num}
                  className="relative border-b border-r border-neutral-200 p-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-2 bg-neutral-900" />
                    <span className="font-mono text-xs text-neutral-300">{cap.num}</span>
                  </div>

                  {/* Illustration placeholder */}
                  <div className="my-6 flex h-24 items-center justify-center rounded-sm bg-neutral-100">
                    <div className="h-12 w-12 rounded-sm bg-neutral-200" />
                  </div>

                  <h4 className="font-mono text-sm font-bold text-neutral-900">{cap.title}</h4>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-neutral-500">
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
