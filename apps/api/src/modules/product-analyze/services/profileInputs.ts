import type { OnboardingResponse } from '@acme/shared';
import { getUserOnboarding } from './onboarding';
import { prisma } from '../lib/prisma';
import { hasActiveFamilyMembersSubscription } from '../../user/subscription-access';

export interface ProfileInput {
  profileId: string;
  profileName: string;
  onboarding: OnboardingResponse;
}

/**
 * Fetch the user's onboarding + family members and build a list of ProfileInput.
 */
export const getProfileInputs = async (
  userId: string,
): Promise<ProfileInput[]> => {
  const [onboarding, hasActiveSubscription] = await Promise.all([
    getUserOnboarding(userId),
    hasActiveFamilyMembersSubscription(userId),
  ]);

  const profiles: ProfileInput[] = [
    { profileId: 'you', profileName: 'You', onboarding },
  ];

  if (!hasActiveSubscription) {
    return profiles;
  }

  const familyMembers = await prisma.familyMember.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  for (const member of familyMembers) {
    profiles.push({
      profileId: member.id,
      profileName: member.name,
      onboarding: {
        mainGoal: member.mainGoal,
        restrictions: member.restrictions,
        allergies: member.allergies,
        otherAllergiesText: member.otherAllergiesText,
        nutritionPriorities: member.nutritionPriorities,
        legacyDietType: null,
        onboardingCompleted: true,
      },
    });
  }

  return profiles;
};
