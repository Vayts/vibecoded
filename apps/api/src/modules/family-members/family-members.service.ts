import { Injectable } from '@nestjs/common';
import type { FamilyMember } from '@prisma/client';
import { ApiError } from '../../shared/errors/api-error';
import { prisma } from '../product-analyze/lib/prisma';
import {
  hasAnalysisRelevantFamilyMemberChanges,
  touchUserAnalysisPreferencesUpdatedAt,
} from '../product-analyze/services/analysis-cache';
import { MAX_FAMILY_MEMBERS } from './family-members.constants';
import {
  createFamilyMemberRequestSchema,
  updateFamilyMemberRequestSchema,
} from './family-members.schemas';

const serializeFamilyMember = (member: FamilyMember) => ({
  id: member.id,
  name: member.name,
  avatarUrl: member.avatarUrl,
  mainGoal: member.mainGoal,
  restrictions: member.restrictions,
  allergies: member.allergies,
  otherAllergiesText: member.otherAllergiesText,
  nutritionPriorities: member.nutritionPriorities,
  createdAt: member.createdAt.toISOString(),
  updatedAt: member.updatedAt.toISOString(),
});

@Injectable()
export class FamilyMembersService {
  async list(userId: string) {
    const members = await prisma.familyMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return { items: members.map(serializeFamilyMember) };
  }

  async create(userId: string, body: unknown) {
    const parsed = createFamilyMemberRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid family member payload');
    }

    const count = await prisma.familyMember.count({ where: { userId } });

    if (count >= MAX_FAMILY_MEMBERS) {
      throw ApiError.badRequest(
        `You can add up to ${MAX_FAMILY_MEMBERS} family members`,
        'LIMIT_REACHED',
      );
    }

    const member = await prisma.familyMember.create({
      data: {
        userId,
        name: parsed.data.name,
        avatarUrl: parsed.data.avatarUrl ?? null,
        mainGoal: parsed.data.mainGoal ?? null,
        restrictions: parsed.data.restrictions ?? [],
        allergies: parsed.data.allergies ?? [],
        otherAllergiesText: parsed.data.otherAllergiesText ?? null,
        nutritionPriorities: parsed.data.nutritionPriorities ?? [],
      },
    });

    return serializeFamilyMember(member);
  }

  async update(userId: string, memberId: string, body: unknown) {
    const existingMember = await this.requireOwnedMember(userId, memberId);

    const parsed = updateFamilyMemberRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid update payload');
    }

    const shouldInvalidateCache = hasAnalysisRelevantFamilyMemberChanges(
      existingMember,
      parsed.data,
    );

    const member = await prisma.$transaction(async (tx) => {
      const updatedMember = await tx.familyMember.update({
        where: { id: memberId },
        data: parsed.data,
      });

      if (shouldInvalidateCache) {
        await touchUserAnalysisPreferencesUpdatedAt(userId, tx);
      }

      return updatedMember;
    });

    return serializeFamilyMember(member);
  }

  async remove(userId: string, memberId: string) {
    await this.requireOwnedMember(userId, memberId);
    await prisma.$transaction(async (tx) => {
      await tx.familyMember.delete({ where: { id: memberId } });
      await touchUserAnalysisPreferencesUpdatedAt(userId, tx);
    });
    return { success: true };
  }

  private async requireOwnedMember(userId: string, memberId: string) {
    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });

    if (!member) {
      throw ApiError.notFound('Family member not found');
    }

    return member;
  }
}
