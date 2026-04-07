import { Injectable } from '@nestjs/common';
import { ApiError } from '../../shared/errors/api-error';
import {
  getUserOnboarding,
  upsertUserOnboarding,
} from '../product-analyze/services/onboarding';
import { onboardingRequestSchema } from './me.schemas';

@Injectable()
export class MeService {
  getOnboarding(userId: string) {
    return getUserOnboarding(userId);
  }

  saveOnboarding(userId: string, body: unknown) {
    const parsed = onboardingRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues[0]?.message ?? 'Invalid onboarding payload',
      );
    }

    return upsertUserOnboarding(userId, parsed.data);
  }
}
