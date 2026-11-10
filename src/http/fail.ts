import { HttpException, HttpStatus } from '@nestjs/common';

export function fail(error: string, status: HttpStatus): never {
  throw new HttpException({ error }, status);
}
