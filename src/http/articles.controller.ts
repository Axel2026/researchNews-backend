import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { popularizeBodySchema } from '../ai-keys/body';
import { getArticleImage } from '../articles/images/repository';
import { parseLocale } from '../articles/locale';
import {
  getArticleBySlug,
  listArticlePage,
  listArticles,
} from '../articles/repository';
import {
  articleDateBounds,
  parseArticleDate,
  parseArticleField,
  parseArticlePage,
  parseArticleQuery,
  parseArticleSort,
} from '../articles/search';
import { parseSlug } from '../articles/slug';
import { AuthGuard } from '../auth/guard';
import { type AuthUser, CurrentUser } from '../auth/user';
import { popularizeArticle } from '../popularize/run';
import { recordArticleView } from '../views/repository';
import { fail } from './fail';
import { queryParam } from './query';

@Controller()
export class ArticlesController {
  @Get('articles')
  async list(@Query() query: Record<string, unknown>) {
    const parsed = parseLocale(queryParam(query, 'locale'));
    if (!parsed.ok) {
      fail('invalid_locale', HttpStatus.BAD_REQUEST);
    }

    const text = parseArticleQuery(queryParam(query, 'q'));
    const author = parseArticleQuery(queryParam(query, 'author'));
    const field = parseArticleField(queryParam(query, 'field'));
    const sort = parseArticleSort(queryParam(query, 'sort'));
    const from = parseArticleDate(queryParam(query, 'from'));
    const to = parseArticleDate(queryParam(query, 'to'));
    const page = parseArticlePage(queryParam(query, 'page'));
    if (
      !text.ok ||
      !author.ok ||
      !field.ok ||
      !sort.ok ||
      !from.ok ||
      !to.ok ||
      !page.ok
    ) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const bounds = articleDateBounds(from.date, to.date);
    if (!bounds.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const options = {
      query: text.query,
      author: author.query,
      field: field.field,
      sort: sort.sort,
      start: bounds.start,
      endExclusive: bounds.endExclusive,
    };

    if (page.page === undefined) {
      return listArticles(parsed.locale, options);
    }

    return listArticlePage(parsed.locale, { ...options, page: page.page });
  }

  @Get('articles/:slug/image')
  async image(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const parsed = parseSlug(slug);
    if (!parsed.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const image = await getArticleImage(parsed.slug);
    if (!image) {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    response.setHeader('Cache-Control', 'public, max-age=86400');
    return new StreamableFile(image.bytes, { type: image.contentType });
  }

  @Post('articles/:slug/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async view(@Param('slug') slug: string): Promise<void> {
    const parsed = parseSlug(slug);
    if (!parsed.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const result = await recordArticleView(parsed.slug);
    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }
  }

  @Get('articles/:slug')
  async bySlug(
    @Param('slug') slug: string,
    @Query() query: Record<string, unknown>,
  ) {
    const parsed = parseLocale(queryParam(query, 'locale'));
    if (!parsed.ok) {
      fail('invalid_locale', HttpStatus.BAD_REQUEST);
    }

    const parsedSlug = parseSlug(slug);
    if (!parsedSlug.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const article = await getArticleBySlug(parsedSlug.slug, parsed.locale);
    if (!article) {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    return article;
  }

  @Post('articles/:slug/popularize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async popularize(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const parsed = popularizeBodySchema.safeParse(body);
    if (!parsed.success) {
      fail('invalid_body', HttpStatus.BAD_REQUEST);
    }

    const parsedSlug = parseSlug(slug);
    if (!parsedSlug.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const result = await popularizeArticle({
      slug: parsedSlug.slug,
      userId: user.userId,
      email: user.email,
      provider: parsed.data.provider,
    });

    if (result === 'saved') {
      return;
    }

    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    if (result === 'provider_error') {
      fail('provider_error', HttpStatus.BAD_GATEWAY);
    }

    if (result === 'invalid_generation') {
      fail('invalid_generation', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    fail(result, HttpStatus.CONFLICT);
  }
}
