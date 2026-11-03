function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

const PORT = Number(process.env.PORT ?? 4000);

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  PORT,
  API_PUBLIC_URL: (
    process.env.API_PUBLIC_URL ?? `http://localhost:${PORT}`
  ).replace(/\/$/, ''),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: requireEnv('SUPABASE_PUBLISHABLE_KEY'),
  SUPABASE_SECRET_KEY: requireEnv('SUPABASE_SECRET_KEY'),
  SUPABASE_JWKS_URL: requireEnv('SUPABASE_JWKS_URL'),
};
