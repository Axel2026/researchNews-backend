import { Controller, Get } from '@nestjs/common';
import { pingSupabase } from '../supabase/client';

@Controller()
export class HealthController {
  @Get('health')
  async health(): Promise<{ ok: true; supabase: boolean }> {
    return { ok: true, supabase: await pingSupabase() };
  }
}
