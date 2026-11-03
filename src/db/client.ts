import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

function connectionOptions(url: string) {
  if (!/supabase\.(co|com)/.test(url)) {
    return {};
  }

  return {
    prepare: false,
    ssl: 'require' as const,
  };
}

const queryClient = postgres(
  env.DATABASE_URL,
  connectionOptions(env.DATABASE_URL),
);

export const db = drizzle(queryClient, { schema });
export { queryClient };
