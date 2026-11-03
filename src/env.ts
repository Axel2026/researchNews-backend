function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: requireEnv('SUPABASE_PUBLISHABLE_KEY'),
  SUPABASE_SECRET_KEY: requireEnv('SUPABASE_SECRET_KEY'),
  SUPABASE_JWKS_URL: requireEnv('SUPABASE_JWKS_URL'),
};
