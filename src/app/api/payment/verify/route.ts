import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { USDC_BASE, DEPOSIT_ADDRESS } from '@/lib/web3/contracts';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txHash, plan, amount, paymentMethod = 'direct' } = body;

    // x402 payments are verified and settled by the facilitator during the API call
    if (paymentMethod === 'x402') {
      return NextResponse.json({
        status: 'confirmed',
        plan,
        paymentMethod: 'x402',
      });
    }

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 400 });
    }

    // Verify it was a USDC transfer to our deposit address
    const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
    const logs = receipt.logs.filter(
      (log) => log.address.toLowerCase() === USDC_BASE.address.toLowerCase()
    );

    const validTransfer = logs.some((log) => {
      try {
        const toAddress = '0x' + log.topics[2]?.slice(26);
        return toAddress?.toLowerCase() === DEPOSIT_ADDRESS.toLowerCase();
      } catch {
        return false;
      }
    });

    if (!validTransfer) {
      return NextResponse.json({ error: 'Invalid transfer' }, { status: 400 });
    }

    return NextResponse.json({
      status: 'confirmed',
      txHash,
      plan,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
