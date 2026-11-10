import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { AuthGuard } from './auth/guard';
import { ArticlesController } from './http/articles.controller';
import { CategoriesController } from './http/categories.controller';
import { CommentsController } from './http/comments.controller';
import { HealthController } from './http/health.controller';
import { JsonBodyMiddleware } from './http/json-body.middleware';
import { MeController } from './http/me.controller';
import { SourcesController } from './http/sources.controller';

@Module({
  controllers: [
    HealthController,
    ArticlesController,
    SourcesController,
    CategoriesController,
    CommentsController,
    MeController,
  ],
  providers: [AuthGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(JsonBodyMiddleware).forRoutes('{*path}');
  }
}
