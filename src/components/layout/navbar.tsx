'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white">
              <rect x="3" y="3" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="12" y="3" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="3" y="12" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="12" y="12" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </div>
          <span className="font-mono text-lg font-bold tracking-tight text-neutral-900">
            HUMUTER
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#agents" className="font-mono text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            Agents
          </Link>
          <Link href="#how-it-works" className="font-mono text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            How It Works
          </Link>
          <Link href="#pricing" className="font-mono text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            Pricing
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="font-mono text-sm text-neutral-500 hover:text-neutral-900">
              Log in
            </Button>
          </Link>
          <Link href="/onboarding/agents">
            <Button size="sm" className="rounded-none bg-orange-500 px-6 font-mono text-sm text-white hover:bg-orange-600">
              GET STARTED
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
