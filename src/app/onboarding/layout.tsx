import Link from 'next/link';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-none bg-orange-500">
              <div className="h-3 w-3 bg-white" />
            </div>
            <span className="font-mono text-lg font-bold tracking-tight text-neutral-900">HUMUTER</span>
            <span className="rounded-sm bg-orange-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-orange-600">Beta</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
