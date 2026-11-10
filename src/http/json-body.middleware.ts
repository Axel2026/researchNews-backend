import { Injectable, type NestMiddleware } from '@nestjs/common';
import { json, type NextFunction, type Request, type Response } from 'express';
import { isInvalidJson } from './invalid-json';

@Injectable()
export class JsonBodyMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    json()(request, response, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (isInvalidJson(error)) {
        response.status(400).json({ error: 'invalid_body' });
        return;
      }

      next(error);
    });
  }
}
