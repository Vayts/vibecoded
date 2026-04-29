import type { AnalysisSocketEventPayload } from '@acme/shared';
import { Injectable } from '@nestjs/common';
import {
  buildAnalysisSocketPayload,
  type BuildAnalysisSocketPayloadInput,
} from './analysis-state';

interface AnalysisSessionRecord {
  userId: string;
  payload: AnalysisSocketEventPayload;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const TERMINAL_STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AnalysisSessionStoreService {
  private readonly sessions = new Map<string, AnalysisSessionRecord>();

  create(input: { userId: string } & BuildAnalysisSocketPayloadInput): void {
    this.set(input.analysisId, input.userId, buildAnalysisSocketPayload(input));
  }

  update(input: { userId: string } & BuildAnalysisSocketPayloadInput): AnalysisSocketEventPayload {
    const payload = buildAnalysisSocketPayload(input);
    this.set(input.analysisId, input.userId, payload);
    return payload;
  }

  findForUser(userId: string, analysisId: string): AnalysisSocketEventPayload | null {
    const session = this.sessions.get(analysisId);
    if (!session || session.userId !== userId) {
      return null;
    }

    return session.payload;
  }

  private set(analysisId: string, userId: string, payload: AnalysisSocketEventPayload): void {
    const existing = this.sessions.get(analysisId);
    if (existing?.cleanupTimer) {
      clearTimeout(existing.cleanupTimer);
    }

    const cleanupTimer =
      payload.status === 'pending'
        ? undefined
        : setTimeout(() => {
            this.clear(analysisId);
          }, TERMINAL_STATE_TTL_MS);

    this.sessions.set(analysisId, {
      userId,
      payload,
      ...(cleanupTimer ? { cleanupTimer } : {}),
    });
  }

  private clear(analysisId: string): void {
    const existing = this.sessions.get(analysisId);
    if (existing?.cleanupTimer) {
      clearTimeout(existing.cleanupTimer);
    }

    this.sessions.delete(analysisId);
  }
}

