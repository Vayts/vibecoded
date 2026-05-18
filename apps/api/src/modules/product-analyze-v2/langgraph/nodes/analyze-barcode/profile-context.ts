import { ApiError } from '../../../../../shared/errors/api-error.js';
import { prisma } from '../../../../../shared/lib/prisma.js';
import type { MainGoal, ProfileInputForScoring } from '../../../types/scoring.types.js';
import { normalizeProfileInput } from '../../../utils/normalize-profile-input.util.js';

export interface ProductAnalyzeProfileContext {
  mainProfile: ProfileInputForScoring;
  familyProfiles: ProfileInputForScoring[];
  allProfiles: ProfileInputForScoring[];
  familyEnabled: boolean;
  subscriptionStatus: string | null;
}

const isFamilyAnalysisEnabled = (
  subscriptionStatus: string | null | undefined,
  subscriptionExpiry: Date | null | undefined,
): boolean => {
  return (
    subscriptionStatus === 'active' && (!subscriptionExpiry || subscriptionExpiry > new Date())
  );
};

export async function loadProductAnalyzeProfileContext(
  userId: string,
): Promise<ProductAnalyzeProfileContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
      profile: {
        select: {
          id: true,
          mainGoal: true,
          restrictions: true,
          allergies: true,
          otherAllergiesText: true,
        },
      },
      familyMembers: {
        select: {
          id: true,
          name: true,
          mainGoal: true,
          restrictions: true,
          allergies: true,
          otherAllergiesText: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.unauthorized();
  }

  const familyEnabled = isFamilyAnalysisEnabled(user.subscriptionStatus, user.subscriptionExpiry);
  const mainProfile = normalizeProfileInput({
    profileId: user.profile?.id ?? userId,
    profileType: 'user',
    displayName: user.name ?? null,
    mainGoal: (user.profile?.mainGoal as MainGoal | null) ?? null,
    restrictions: user.profile?.restrictions ?? [],
    allergies: user.profile?.allergies ?? [],
    otherAllergiesText: user.profile?.otherAllergiesText ?? null,
  });

  const familyProfiles: ProfileInputForScoring[] = familyEnabled
    ? user.familyMembers.map((member) =>
        normalizeProfileInput({
          profileId: member.id,
          profileType: 'family_member' as const,
          displayName: member.name,
          mainGoal: (member.mainGoal as MainGoal | null) ?? null,
          restrictions: member.restrictions ?? [],
          allergies: member.allergies ?? [],
          otherAllergiesText: member.otherAllergiesText ?? null,
        }),
      )
    : [];

  return {
    mainProfile,
    familyProfiles,
    allProfiles: [mainProfile, ...familyProfiles],
    familyEnabled,
    subscriptionStatus: user.subscriptionStatus,
  };
}
