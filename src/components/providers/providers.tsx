'use client';

import { ThemeProvider } from './theme-provider';
import { Web3Provider } from './web3-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Web3Provider>
        <TooltipProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </TooltipProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}
