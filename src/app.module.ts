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
import { createObserveModule } from '@nestjs/observe';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY,
      appSecret: process.env.OBSERVE_APP_SECRET,
      serviceId: 'research-news-backend',
    }),
  ],
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
