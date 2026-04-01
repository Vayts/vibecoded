import { Hono } from 'hono';
import { createFamilyMemberRequestSchema, updateFamilyMemberRequestSchema } from '@acme/shared';
import type { AuthVariables } from '../middleware/requireAuth';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

const MAX_FAMILY_MEMBERS = 10;

export const familyMembersRoute = new Hono<{ Variables: AuthVariables }>();

const serializeFamilyMember = (member: {
  id: string;
  name: string;
  mainGoal: string | null;
  restrictions: string[];
  allergies: string[];
  otherAllergiesText: string | null;
  nutritionPriorities: string[];
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: member.id,
  name: member.name,
  mainGoal: member.mainGoal,
  restrictions: member.restrictions,
  allergies: member.allergies,
  otherAllergiesText: member.otherAllergiesText,
  nutritionPriorities: member.nutritionPriorities,
  createdAt: member.createdAt.toISOString(),
  updatedAt: member.updatedAt.toISOString(),
});

familyMembersRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  const members = await prisma.familyMember.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return c.json({ items: members.map(serializeFamilyMember) });
});

familyMembersRoute.post('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = createFamilyMemberRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid family member payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const count = await prisma.familyMember.count({ where: { userId } });
  if (count >= MAX_FAMILY_MEMBERS) {
    return c.json(
      { error: `You can add up to ${MAX_FAMILY_MEMBERS} family members`, code: 'LIMIT_REACHED' },
      400,
    );
  }

  const member = await prisma.familyMember.create({
    data: {
      userId,
      name: parsed.data.name,
      mainGoal: parsed.data.mainGoal ?? null,
      restrictions: parsed.data.restrictions ?? [],
      allergies: parsed.data.allergies ?? [],
      otherAllergiesText: parsed.data.otherAllergiesText ?? null,
      nutritionPriorities: parsed.data.nutritionPriorities ?? [],
    },
  });

  return c.json(serializeFamilyMember(member), 201);
});

familyMembersRoute.patch('/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const memberId = c.req.param('id');

  const existing = await prisma.familyMember.findFirst({
    where: { id: memberId, userId },
  });

  if (!existing) {
    return c.json({ error: 'Family member not found', code: 'NOT_FOUND' }, 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = updateFamilyMemberRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid update payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const member = await prisma.familyMember.update({
    where: { id: memberId },
    data: parsed.data,
  });

  return c.json(serializeFamilyMember(member));
});

familyMembersRoute.delete('/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const memberId = c.req.param('id');

  const existing = await prisma.familyMember.findFirst({
    where: { id: memberId, userId },
  });

  if (!existing) {
    return c.json({ error: 'Family member not found', code: 'NOT_FOUND' }, 404);
  }

  await prisma.familyMember.delete({ where: { id: memberId } });

  return c.json({ success: true });
});
