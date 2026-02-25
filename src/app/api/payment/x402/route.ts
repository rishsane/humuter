import { NextRequest, NextResponse } from 'next/server';
import { withX402, x402ResourceServer } from '@x402/next';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { getPaymentRouteConfig, X402_FACILITATOR_URL } from '@/lib/web3/x402';
import { PRICING_TIERS } from '@/lib/constants/pricing';

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
  return tier?.chargePrice ?? tier?.monthlyPrice ?? 99;
}

// Default export for starter tier — client passes ?plan= to select tier
// The price is determined by the plan query param
export const GET = withX402(
  handler,
  getPaymentRouteConfig(1),
  server,
);

// Create plan-specific handlers via dynamic route matching
// For MVP, we expose per-plan endpoints as query params handled by a single POST
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
