import crypto from 'crypto';

export function generateApiKey(): string {
  const key = crypto.randomBytes(32).toString('hex');
  return `hmt_${key}`;
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...';
}

export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
