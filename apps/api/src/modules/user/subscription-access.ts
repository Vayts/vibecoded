import { HttpStatus } from '@nestjs/common';

import { ApiError } from '../../shared/errors/api-error';
import { prisma } from '../product-analyze/lib/prisma';

export const FAMILY_MEMBERS_SUBSCRIPTION_ERROR = {
  code: 'SUBSCRIPTION_REQUIRED',
  message: 'Family members require an active subscription',
} as const;

export const hasActiveSubscription = (user: {
  subscriptionExpiry: Date | null | undefined;
}): boolean => {
  if (!user.subscriptionExpiry) {
    return false;
  }

  return user.subscriptionExpiry.getTime() > Date.now();
};

export const hasActiveFamilyMembersSubscription = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionExpiry: true },
  });

  if (!user) {
    return false;
  }

  return hasActiveSubscription(user);
};

export const requireActiveFamilyMembersSubscription = async (userId: string): Promise<void> => {
  const hasAccess = await hasActiveFamilyMembersSubscription(userId);

  if (hasAccess) {
    return;
  }

  throw new ApiError(HttpStatus.FORBIDDEN, {
    error: FAMILY_MEMBERS_SUBSCRIPTION_ERROR.message,
    code: FAMILY_MEMBERS_SUBSCRIPTION_ERROR.code,
  });
};
