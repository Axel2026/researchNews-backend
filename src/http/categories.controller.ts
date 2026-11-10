import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { parseLocale } from '../articles/locale';
import { parseArticlePage } from '../articles/search';
import { parseSlug } from '../articles/slug';
import { getCategoryBySlug, listCategories } from '../categories/repository';
import { fail } from './fail';
import { queryParam } from './query';

@Controller()
export class CategoriesController {
  @Get('categories')
  async list(@Query() query: Record<string, unknown>) {
    const parsed = parseLocale(queryParam(query, 'locale'));
    if (!parsed.ok) {
      fail('invalid_locale', HttpStatus.BAD_REQUEST);
    }

    return listCategories(parsed.locale);
  }

  @Get('categories/:slug')
  async bySlug(
    @Param('slug') slug: string,
    @Query() query: Record<string, unknown>,
  ) {
    const parsed = parseLocale(queryParam(query, 'locale'));
    if (!parsed.ok) {
      fail('invalid_locale', HttpStatus.BAD_REQUEST);
    }

    const page = parseArticlePage(queryParam(query, 'page'));
    const parsedSlug = parseSlug(slug);
    if (!page.ok || !parsedSlug.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const category = await getCategoryBySlug(
      parsedSlug.slug,
      parsed.locale,
      page.page ?? 1,
    );
    if (!category) {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    return category;
  }
}
