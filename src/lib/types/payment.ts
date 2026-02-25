export interface Payment {
  id: string;
  user_id: string;
  agent_id: string | null;
  amount_usd: number;
  amount_usdc: number | null;
  tx_hash: string | null;
  from_address: string | null;
  to_address: string | null;
  chain: string;
  status: 'pending' | 'confirmed' | 'failed';
  payment_method: 'usdc_base' | 'stripe';
  created_at: string;
  confirmed_at: string | null;
}
