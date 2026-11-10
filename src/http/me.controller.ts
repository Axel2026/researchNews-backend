import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { popularizeBodySchema, saveAiKeySchema } from '../ai-keys/body';
import {
  deleteAiKey as removeAiKey,
  listAiKeys,
  saveAiKey as storeAiKey,
} from '../ai-keys/repository';
import { isAiProvider } from '../ai-keys/providers';
import { parseLocale } from '../articles/locale';
import { AuthGuard } from '../auth/guard';
import { type AuthUser, CurrentUser } from '../auth/user';
import { bookmarkUpdateSchema } from '../bookmarks/body';
import {
  listBookmarks,
  setBookmark as storeBookmark,
} from '../bookmarks/repository';
import { fail } from './fail';
import { queryParam } from './query';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get('bookmarks')
  async bookmarks(
    @Query() query: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    const parsed = parseLocale(queryParam(query, 'locale'));
    if (!parsed.ok) {
      fail('invalid_locale', HttpStatus.BAD_REQUEST);
    }

    return listBookmarks(user.userId, parsed.locale);
  }

  @Put('bookmarks')
  async setBookmark(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = bookmarkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      fail('invalid_body', HttpStatus.BAD_REQUEST);
    }

    const result = await storeBookmark(
      user.userId,
      parsed.data.slug,
      parsed.data.bookmarked,
    );
    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    return result;
  }

  @Get('ai-keys')
  async aiKeys(@CurrentUser() user: AuthUser) {
    return { keys: await listAiKeys(user.userId) };
  }

  @Put('ai-keys')
  async saveAiKey(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = saveAiKeySchema.safeParse(body);
    if (!parsed.success) {
      fail('invalid_body', HttpStatus.BAD_REQUEST);
    }

    const saved = await storeAiKey(
      user.userId,
      parsed.data.provider,
      parsed.data.model,
      parsed.data.apiKey,
    );
    if (saved === 'missing_key') {
      fail('invalid_body', HttpStatus.BAD_REQUEST);
    }

    return saved;
  }

  @Delete('ai-keys/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAiKey(
    @Param('provider') provider: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!isAiProvider(provider)) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    await removeAiKey(user.userId, provider);
  }
}
