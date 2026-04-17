import { HttpException, HttpStatus } from '@nestjs/common';

interface ApiErrorPayload {
  error: string;
  code: string;
}

export class ApiError extends HttpException {
  constructor(status: number, payload: ApiErrorPayload) {
    super(payload, status);
  }

  static badRequest(error: string, code = 'VALIDATION_ERROR'): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, { error, code });
  }

  static unauthorized(error = 'Authentication required', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, { error, code });
  }

  static notFound(error: string, code = 'NOT_FOUND'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, { error, code });
  }

  static unprocessable(error: string, code: string): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, { error, code });
  }

  static badGateway(error: string, code: string): ApiError {
    return new ApiError(HttpStatus.BAD_GATEWAY, { error, code });
  }
}
