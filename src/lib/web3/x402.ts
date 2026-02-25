import { DEPOSIT_ADDRESS } from './contracts';

export const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ||
  'https://x402-facilitator.coinbase-developer-platform.workers.dev/facilitator';

export const BASE_NETWORK = 'eip155:8453' as const;

export function getPaymentRouteConfig(priceUsd: number) {
  return {
    description: `Humuter subscription - $${priceUsd}/month`,
    mimeType: 'application/json' as const,
    accepts: {
      scheme: 'exact' as const,
      network: BASE_NETWORK,
      payTo: DEPOSIT_ADDRESS,
      price: `$${priceUsd}`,
      maxTimeoutSeconds: 300,
    },
  };
}
