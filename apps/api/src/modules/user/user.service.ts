import { Injectable } from '@nestjs/common';
import { ApiError } from '../../shared/errors/api-error';
import { prisma } from '../product-analyze/lib/prisma';
import { updateUserRequestSchema } from './user.schemas';

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionResponse {
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionExpiry: string | null;
  isPro: boolean;
  freeGenerationsBalance: number;
}

const serializeUser = (user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}): SerializedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

@Injectable()
export class UserService {
  async updateProfile(userId: string, body: unknown) {
    const parsed = updateUserRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues[0]?.message ?? 'Invalid user payload',
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      data: { name: parsed.data.name },
    });

    return serializeUser(updated);
  }

  async getSubscription(userId: string): Promise<UserSubscriptionResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionExpiry: true,
        freeGenerationsBalance: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null,
      isPro: user.subscriptionStatus === 'active',
      freeGenerationsBalance: user.freeGenerationsBalance,
    };
  }

  async remove(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
