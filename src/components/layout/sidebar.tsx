'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cpu, LayoutDashboard, Bot, Key, CreditCard, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-neutral-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-neutral-200 px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-orange-500">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight text-neutral-900">HUMUTER</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-none px-3 py-2.5 font-mono text-sm transition-colors',
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-neutral-500 hover:bg-orange-50 hover:text-neutral-900'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-neutral-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 font-mono text-sm text-neutral-400 transition-colors hover:text-neutral-900"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
