import {
  isActiveSubscriptionStatus,
  type OnboardingResponse,
  UserSubscriptionResponse,
} from '@acme/shared';
import { Injectable } from '@nestjs/common';
import { ApiError } from '../../shared/errors/api-error';
import { prisma } from '../product-analyze/lib/prisma';
import { deleteStoredObject } from '../product-analyze/lib/storage';
import { updateUserRequestSchema } from './user.schemas';

export type SerializedUserProfile = OnboardingResponse & {
  id: string;
};

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avatarUrl: string | null;
  profile: SerializedUserProfile | null;
  createdAt: string;
  updatedAt: string;
}

const serializeUser = (user: {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avatarUrl: string | null;
  profile: SerializedUserProfile | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  avatarUrl: user.avatarUrl,
  profile: user.profile,
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

const profileSelect = {
  id: true,
  mainGoal: true,
  restrictions: true,
  allergies: true,
  otherAllergiesText: true,
  nutritionPriorities: true,
  legacyDietType: true,
  onboardingCompleted: true,
} as const;

const userWithProfileSelect = {
  ...userSelect,
  profile: {
    select: profileSelect,
  },
} as const;

const isNonEmptyString = (value: string | null): value is string => Boolean(value?.trim());

@Injectable()
export class UserService {
  async getCurrentUser(userId: string): Promise<SerializedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userWithProfileSelect,
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
      select: userWithProfileSelect,
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
      isPro: isActiveSubscriptionStatus(user.subscriptionStatus),
      freeGenerationsBalance: user.freeGenerationsBalance,
    };
  }

  async remove(userId: string) {
    const deletedUserAssets = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          avatarUrl: true,
          familyMembers: {
            select: {
              avatarUrl: true,
            },
          },
          scans: {
            select: {
              photoImagePath: true,
            },
          },
        },
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      await tx.user.delete({ where: { id: userId } });

      return {
        avatarUrl: user.avatarUrl,
        familyMemberAvatarUrls: user.familyMembers.map((member) => member.avatarUrl),
        scanPhotoImagePaths: user.scans.map((scan) => scan.photoImagePath),
      };
    });

    const storedObjectPaths = Array.from(
      new Set(
        [
          deletedUserAssets.avatarUrl,
          ...deletedUserAssets.familyMemberAvatarUrls,
          ...deletedUserAssets.scanPhotoImagePaths,
        ].filter(isNonEmptyString),
      ),
    );

    const deletionResults = await Promise.allSettled(
      storedObjectPaths.map(async (objectPath) => deleteStoredObject(objectPath)),
    );

    deletionResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(
          `[user] failed to delete stored object ${storedObjectPaths[index]}`,
          result.reason,
        );
      }
    });

    return { success: true };
  }
}
