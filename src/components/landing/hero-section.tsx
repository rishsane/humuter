import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Hero3D } from './hero-3d';

export function HeroSection() {
  return (
    <section className="border-b border-neutral-200">
      {/* Main hero grid */}
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left column */}
          <div className="relative border-r border-neutral-200 p-8 md:col-span-4 md:p-12">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3 w-3 bg-orange-500" />
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                AI AGENTS
              </span>
            </div>

            <p className="mt-8 max-w-md font-mono text-base leading-relaxed text-neutral-600">
              Deploy AI agents trained on your
              business data. Automate community
              management, customer support, and
              user onboarding across every channel.
            </p>

            <Link href="/onboarding/agents" className="mt-10 inline-block">
              <Button className="rounded-none bg-orange-500 px-8 py-6 font-mono text-sm uppercase tracking-wider text-white hover:bg-orange-600">
                DEPLOY YOUR AGENT
              </Button>
            </Link>

            <div className="mt-6">
              <a
                href="https://www.producthunt.com/products/humuter?utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-humuter"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1086815&theme=light"
                  alt="Humuter - Deploy AI Agent Mods to manage your TG & Discord communities | Product Hunt"
                  width={250}
                  height={54}
                />
              </a>
            </div>
          </div>

          {/* Center - Big typography + 3D element */}
          <div className="relative flex items-center overflow-hidden border-r border-neutral-200 bg-neutral-50 p-8 md:col-span-8 md:p-12">
            {/* Typography */}
            <div className="flex-1">
              <h1 className="font-mono text-6xl font-bold uppercase leading-none tracking-tighter text-neutral-900 md:text-8xl lg:text-[9rem]">
                HUMU
              </h1>
              <h1 className="font-mono text-6xl font-bold uppercase leading-none tracking-tighter text-neutral-900 md:text-8xl lg:text-[9rem]">
                TER
              </h1>
            </div>

            {/* 3D Element - floating on the right */}
            <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 md:block lg:right-16">
              <Hero3D />
            </div>

            <div className="absolute bottom-4 right-4">
              <div className="h-3 w-3 bg-orange-500" />
            </div>
          </div>
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-2 border-t border-neutral-200 md:grid-cols-4">
          {[
            { value: '24/7', label: 'Always Online' },
            { value: '5 MIN', label: 'Setup Time' },
            { value: 'MULTI', label: 'Channel Deploy' },
            { value: 'WEB3', label: 'Native Payments' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border-r border-neutral-200 p-6 last:border-r-0"
            >
              <p className="font-mono text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-wider text-neutral-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
