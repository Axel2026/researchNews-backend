import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

export async function pingSupabase(): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(new URL('/rest/v1/', env.SUPABASE_URL), {
      headers: {
        apikey: env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new Error('Supabase ping failed', { cause: error });
  }

  return response.ok;
}
