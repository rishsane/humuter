'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const mockKeys = [
  {
    id: '1',
    prefix: 'hmt_a1b2c3d4...',
    agentName: 'Community Guardian',
    createdAt: 'Feb 20, 2026',
    lastUsed: '2 hours ago',
    status: 'active',
  },
];

export default function ApiKeysPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (prefix: string) => {
    navigator.clipboard.writeText(prefix);
    setCopied(prefix);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-bold text-neutral-900">API Keys</h1>
        <p className="font-mono text-sm text-neutral-500">Manage API keys for your agents</p>
      </div>

      <Card className="border border-neutral-200 bg-white rounded-none shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base font-bold text-neutral-900">
            <Key className="h-5 w-5 text-orange-500" />
            Your API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-none p-4"
              >
                <div className="flex items-center gap-4">
                  <code className="font-mono text-sm text-neutral-700">{key.prefix}</code>
                  <Badge variant="outline" className="rounded-none border-neutral-200 font-mono text-xs text-neutral-500">
                    {key.agentName}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-xs text-neutral-400">Created {key.createdAt}</p>
                    <p className="font-mono text-xs text-neutral-400">Last used {key.lastUsed}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(key.prefix)}
                      className="rounded-none text-neutral-400 hover:text-neutral-900"
                    >
                      {copied === key.prefix ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none text-neutral-400 hover:text-neutral-900"
                      onClick={() => toast.info('Key regeneration coming soon')}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border border-neutral-200 bg-neutral-50 rounded-none p-4">
            <p className="font-mono text-sm text-neutral-500">
              API keys are shown only once when created. Store them securely.
              You can regenerate a key, but the old key will stop working immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
