import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

export function createServiceClient() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
}
