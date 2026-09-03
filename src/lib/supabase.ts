import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uouhcutadbnogggpsuhv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_kfo2396RGsaf36l8Xr_OPw_8-S4Gw1B';

export const supabase = createClient(supabaseUrl, supabaseKey);

export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseKey);
}
