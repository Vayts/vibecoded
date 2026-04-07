import { Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import type { Request } from 'express';
import { auth } from '../../modules/product-analyze/lib/auth';
import { prisma } from '../../modules/product-analyze/lib/prisma';
import { ApiError } from '../errors/api-error';

@Injectable()
export class AuthSessionService {
  async getOptionalUserIdFromHeaders(
    headers: IncomingHttpHeaders,
  ): Promise<string | undefined> {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    return session?.user?.id ?? undefined;
  }

  async getOptionalUserId(request: Request): Promise<string | undefined> {
    return this.getOptionalUserIdFromHeaders(request.headers);
  }

  async requireUserIdFromHeaders(
    headers: IncomingHttpHeaders,
  ): Promise<string> {
    const userId = await this.getOptionalUserIdFromHeaders(headers);

    if (!userId) {
      throw ApiError.unauthorized();
    }

    return this.ensureUserExists(userId);
  }

  async requireUserId(request: Request): Promise<string> {
    const userId = await this.getOptionalUserId(request);

    if (!userId) {
      throw ApiError.unauthorized();
    }

    return this.ensureUserExists(userId);
  }

  private async ensureUserExists(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw ApiError.unauthorized(
        'The authenticated user no longer exists. Please sign in again.',
        'SESSION_USER_NOT_FOUND',
      );
    }

    return user.id;
  }
}
