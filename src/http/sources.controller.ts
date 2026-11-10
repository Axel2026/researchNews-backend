import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { listSources } from '../sources/repository';
import { parseLocale } from '../articles/locale';
import { fail } from './fail';
import { queryParam } from './query';

@Controller()
export class SourcesController {
  @Get('sources')
  async list(@Query() query: Record<string, unknown>) {
    const parsed = parseLocale(queryParam(query, 'locale'));
    if (!parsed.ok) {
      fail('invalid_locale', HttpStatus.BAD_REQUEST);
    }

    return listSources(parsed.locale);
  }
}
