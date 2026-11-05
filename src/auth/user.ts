import type { MiddlewareHandler } from 'hono';
import { supabase } from '../supabase/client';

export type AuthEnv = {
  Variables: {
    userId: string;
    email: string | null;
  };
};

export const requireUser: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.match(/^Bearer\s+(\S+)/i)?.[1];

  if (!token) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  c.set('userId', data.user.id);
  c.set('email', data.user.email ?? null);
  await next();
};
