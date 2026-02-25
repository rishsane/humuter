import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo + Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
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
            </div>
            <p className="mt-4 max-w-sm font-mono text-sm text-neutral-500">
              Deploy AI agents for your business. Train them on your data, deploy them everywhere.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900">
              Product
            </h4>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="#agents" className="font-mono text-sm text-neutral-500 hover:text-neutral-900">Agents</Link>
              <Link href="/onboarding/pricing" className="font-mono text-sm text-neutral-500 hover:text-neutral-900">Pricing</Link>
              <Link href="/auth/login" className="font-mono text-sm text-neutral-500 hover:text-neutral-900">Dashboard</Link>
            </div>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900">
              Connect
            </h4>
            <div className="mt-4 flex flex-col gap-2">
              <span className="font-mono text-sm text-neutral-500">Twitter</span>
              <span className="font-mono text-sm text-neutral-500">Telegram</span>
              <span className="font-mono text-sm text-neutral-500">Discord</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-6">
          <p className="font-mono text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Humuter. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
