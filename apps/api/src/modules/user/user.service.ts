import { Injectable } from '@nestjs/common';
import { ApiError } from '../../shared/errors/api-error';
import { prisma } from '../product-analyze/lib/prisma';
import { deleteStoredObject } from '../product-analyze/lib/storage';
import { updateUserRequestSchema } from './user.schemas';

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avatarUrl: string | null;
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
  image: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  async getCurrentUser(userId: string): Promise<SerializedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return serializeUser(user);
  }

  async updateProfile(userId: string, body: unknown) {
    const parsed = updateUserRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid user payload');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!existingUser) {
      throw ApiError.notFound('User not found');
    }

    const data: {
      name?: string;
      avatarUrl?: string | null;
      image?: string | null;
    } = {};

    if (parsed.data.name !== undefined) {
      data.name = parsed.data.name;
    }

    if (parsed.data.avatarUrl !== undefined) {
      data.avatarUrl = parsed.data.avatarUrl;
      data.image = null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      select: userSelect,
      data,
    });

    if (existingUser.avatarUrl && existingUser.avatarUrl !== updated.avatarUrl) {
      try {
        await deleteStoredObject(existingUser.avatarUrl);
      } catch (error) {
        console.warn(`[user] failed to delete previous avatar ${existingUser.avatarUrl}`, error);
      }
    }

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
