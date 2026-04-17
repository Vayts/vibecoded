import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

interface ErrorPayload {
  error: string;
  code: string;
}

const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

const toErrorPayload = (exception: HttpException): ErrorPayload => {
  const status = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      error: response,
      code: STATUS_CODE_MAP[status] ?? 'HTTP_ERROR',
    };
  }

  if (typeof response === 'object' && response !== null) {
    const payload = response as Record<string, unknown>;
    const message = payload.error ?? payload.message ?? 'Request failed';
    const normalizedMessage = Array.isArray(message)
      ? String(message[0])
      : typeof message === 'string'
        ? message
        : 'Request failed';

    return {
      error: normalizedMessage,
      code:
        typeof payload.code === 'string' ? payload.code : (STATUS_CODE_MAP[status] ?? 'HTTP_ERROR'),
    };
  }

  return {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(toErrorPayload(exception));
      return;
    }

    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
