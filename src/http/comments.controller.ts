import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard';
import { type AuthUser, CurrentUser } from '../auth/user';
import { parseSlug } from '../articles/slug';
import { createCommentSchema, updateCommentSchema } from '../comments/body';
import { displayNameFromEmail } from '../comments/display-name';
import { parseCommentId } from '../comments/id';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../comments/repository';
import { fail } from './fail';

@Controller()
export class CommentsController {
  @Get('articles/:slug/comments')
  async list(@Param('slug') slug: string) {
    const parsed = parseSlug(slug);
    if (!parsed.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const result = await listComments(parsed.slug);
    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    return result;
  }

  @Post('articles/:slug/comments')
  @UseGuards(AuthGuard)
  async create(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      fail('invalid_body', HttpStatus.BAD_REQUEST);
    }

    const parsedSlug = parseSlug(slug);
    if (!parsedSlug.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const result = await createComment({
      slug: parsedSlug.slug,
      userId: user.userId,
      displayName: displayNameFromEmail(user.email),
      body: parsed.data.body,
      parentId: parsed.data.parentId,
    });

    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    if (result === 'invalid_parent') {
      fail('invalid_parent', HttpStatus.BAD_REQUEST);
    }

    if (result === 'rate_limited') {
      fail('rate_limited', HttpStatus.TOO_MANY_REQUESTS);
    }

    return result;
  }

  @Patch('comments/:id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      fail('invalid_body', HttpStatus.BAD_REQUEST);
    }

    const parsedId = parseCommentId(id);
    if (!parsedId.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const result = await updateComment({
      id: parsedId.id,
      userId: user.userId,
      body: parsed.data.body,
    });

    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    if (result === 'forbidden') {
      fail('forbidden', HttpStatus.FORBIDDEN);
    }

    if (result === 'edit_expired') {
      fail('edit_expired', HttpStatus.FORBIDDEN);
    }

    return result;
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const parsedId = parseCommentId(id);
    if (!parsedId.ok) {
      fail('invalid_query', HttpStatus.BAD_REQUEST);
    }

    const result = await deleteComment({
      id: parsedId.id,
      userId: user.userId,
    });

    if (result === 'not_found') {
      fail('not_found', HttpStatus.NOT_FOUND);
    }

    if (result === 'forbidden') {
      fail('forbidden', HttpStatus.FORBIDDEN);
    }

    return result;
  }
}
