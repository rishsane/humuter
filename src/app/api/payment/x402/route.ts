import { NextRequest, NextResponse } from 'next/server';
import { withX402, x402ResourceServer } from '@x402/next';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { getPaymentRouteConfig, X402_FACILITATOR_URL } from '@/lib/web3/x402';
import { PRICING_TIERS, getChargeAmount } from '@/lib/constants/pricing';

const facilitator = new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL });
const server = new x402ResourceServer(facilitator);

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get('plan') || 'starter';

  return NextResponse.json({
    status: 'paid',
    plan,
    paymentMethod: 'x402',
  });
}

function getChargePriceForPlan(plan: string): number {
  const tier = PRICING_TIERS.find((t) => t.id === plan);
  if (!tier) return 179;
  return getChargeAmount(tier, 'monthly');
}

// Default export for starter tier
export const GET = withX402(
  handler,
  getPaymentRouteConfig(getChargePriceForPlan('starter')),
  server,
);

// Plan-specific handler via query param
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get('plan') || 'starter';
  const price = getChargePriceForPlan(plan);

  const wrappedHandler = withX402(
    handler,
    getPaymentRouteConfig(price),
    server,
  );

  return wrappedHandler(req);
}
