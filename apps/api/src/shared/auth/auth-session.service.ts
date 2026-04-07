import { Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../../modules/product-analyze/lib/auth';
import { prisma } from '../../modules/product-analyze/lib/prisma';
import { ApiError } from '../errors/api-error';

@Injectable()
export class AuthSessionService {
  async getOptionalUserId(request: Request): Promise<string | undefined> {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    return session?.user?.id ?? undefined;
  }

  async requireUserId(request: Request): Promise<string> {
    const userId = await this.getOptionalUserId(request);

    if (!userId) {
      throw ApiError.unauthorized();
    }

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
