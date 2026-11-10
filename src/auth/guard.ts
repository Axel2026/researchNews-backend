import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { supabase } from '../supabase/client';
import { fail } from '../http/fail';
import type { AuthenticatedRequest } from './user';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header('authorization');
    const token = header?.match(/^Bearer\s+(\S+)/i)?.[1];

    if (!token) {
      fail('unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      fail('unauthorized', HttpStatus.UNAUTHORIZED);
    }

    request.user = {
      userId: data.user.id,
      email: data.user.email ?? null,
    };
    return true;
  }
}
