import { Prisma } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '../../product-analyze/lib/prisma';
import type { RevenueCatWebhookDto, RevenueCatWebhookEventDto } from './dto/revenuecat-webhook.dto';

const ACTIVE_REVENUECAT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  'PRODUCT_CHANGE',
]);

// Events that set subscription to cancelled (but access remains until expiry)
const CANCELLATION_REVENUECAT_EVENT = 'CANCELLATION';
// Events that fully revoke subscription access
const EXPIRATION_REVENUECAT_EVENT = 'EXPIRATION';
const TRANSFER_REVENUECAT_EVENT = 'TRANSFER';

// Known events that don't affect subscription status — logged as info, not warnings
// BILLING_ISSUE: grace period in effect, access NOT revoked here (handled via EXPIRATION)
// SUBSCRIPTION_PAUSED: access NOT revoked here (handled via EXPIRATION with reason SUBSCRIPTION_PAUSED)
// TEMPORARY_ENTITLEMENT_GRANT: short-term access, followed by INITIAL_PURCHASE or EXPIRATION
// NON_RENEWING_PURCHASE, TEST, EXPERIMENT_ENROLLMENT, etc.: not subscription lifecycle events
const INFORMATIONAL_REVENUECAT_EVENTS = new Set([
  'BILLING_ISSUE',
  'SUBSCRIPTION_PAUSED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'NON_RENEWING_PURCHASE',
  'TEST',
  'EXPERIMENT_ENROLLMENT',
  'VIRTUAL_CURRENCY_TRANSACTION',
  'INVOICE_ISSUANCE',
  'REFUND_REVERSED',
]);
const REVENUECAT_PLAN_MAPPING = {
  chozr_monthly: 'pro_monthly',
  chozr_yearly: 'pro_annual',
  pro_monthly: 'pro_monthly',
  pro_annual: 'pro_annual',
} as const;

const subscriptionUserSelect = {
  id: true,
  subscriptionExpiry: true,
  revenuecatLastEventAt: true,
} as const;

type SubscriptionUser = {
  id: string;
  subscriptionExpiry: Date | null;
  revenuecatLastEventAt: Date | null;
};

type RevenueCatSkippedReason =
  | 'duplicate'
  | 'missing_required_field'
  | 'stale_event'
  | 'unsupported_event'
  | 'unsupported_product'
  | 'user_not_found';

export interface RevenueCatWebhookResult {
  duplicate: boolean;
  updated: boolean;
  skippedReason?: RevenueCatSkippedReason;
}

export const mapRevenueCatPlan = (productId: string | null | undefined): string | null => {
  if (!productId) {
    return null;
  }

  return REVENUECAT_PLAN_MAPPING[productId as keyof typeof REVENUECAT_PLAN_MAPPING] ?? null;
};

export const mapRevenueCatStatus = (eventType: string): string | null => {
  if (ACTIVE_REVENUECAT_EVENTS.has(eventType)) {
    return 'active';
  }

  if (eventType === CANCELLATION_REVENUECAT_EVENT) {
    return 'cancelled';
  }

  if (eventType === EXPIRATION_REVENUECAT_EVENT) {
    return 'expired';
  }

  return null;
};

const isDuplicateWebhookEventError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
};

const formatLogContext = (context: Record<string, unknown>): string => {
  return JSON.stringify(context);
};

const toIsoDate = (timestamp: number | null | undefined): string | null => {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

const getEventLogContext = (event: RevenueCatWebhookEventDto): Record<string, unknown> => {
  return {
    eventId: event.id,
    eventType: event.type,
    eventTimestampMs: event.event_timestamp_ms,
    eventTimestampAt: toIsoDate(event.event_timestamp_ms),
    appUserId: event.app_user_id ?? null,
    originalAppUserId: event.original_app_user_id ?? null,
    aliases: event.aliases,
    productId: event.product_id ?? null,
    newProductId: event.new_product_id ?? null,
    expirationAtMs: event.expiration_at_ms,
    expirationAt: toIsoDate(event.expiration_at_ms),
    entitlementIds: event.entitlement_ids,
    transferredFrom: event.transferred_from,
    transferredTo: event.transferred_to,
    store: event.store ?? null,
    environment: event.environment ?? null,
    periodType: event.period_type ?? null,
    cancelReason: event.cancel_reason ?? null,
    expirationReason: event.expiration_reason ?? null,
    isTrialConversion: event.is_trial_conversion ?? null,
    price: event.price ?? null,
    currency: event.currency ?? null,
    countryCode: event.country_code ?? null,
  };
};

const getEventTimestampDate = (event: RevenueCatWebhookEventDto): Date => {
  return new Date(event.event_timestamp_ms);
};

const getExpirationDate = (event: RevenueCatWebhookEventDto): Date | null => {
  if (event.expiration_at_ms === null) {
    return null;
  }

  return new Date(event.expiration_at_ms);
};

const getPrimaryRevenueCatUserId = (event: RevenueCatWebhookEventDto): string | null => {
  return event.app_user_id ?? event.transferred_to[0] ?? null;
};

const getEffectiveProductId = (event: RevenueCatWebhookEventDto): string | null => {
  return event.new_product_id ?? event.product_id ?? null;
};

const isStaleEvent = (lastEventAt: Date | null, incomingEventAt: Date): boolean => {
  return lastEventAt !== null && lastEventAt.getTime() > incomingEventAt.getTime();
};

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  async handleWebhook(payload: RevenueCatWebhookDto): Promise<RevenueCatWebhookResult> {
    const eventContext = getEventLogContext(payload.event);
    const eventTimestampAt = getEventTimestampDate(payload.event);

    this.logger.log(
      `Starting RevenueCat webhook transaction ${formatLogContext({
        apiVersion: payload.api_version ?? null,
        ...eventContext,
      })}`,
    );

    try {
      return await prisma.$transaction(async (tx) => {
        this.logger.log(`Recording RevenueCat webhook event ${formatLogContext(eventContext)}`);

        await tx.revenueCatWebhookEvent.create({
          data: {
            id: payload.event.id,
            type: payload.event.type,
            userId: getPrimaryRevenueCatUserId(payload.event),
            eventTimestampAt,
          },
        });

        this.logger.log(`Recorded RevenueCat webhook event ${formatLogContext(eventContext)}`);

        const result = await this.applyWebhookEvent(tx, payload.event);

        this.logger.log(
          `Finished RevenueCat webhook transaction ${formatLogContext({
            ...eventContext,
            duplicate: result.duplicate,
            updated: result.updated,
            skippedReason: result.skippedReason ?? null,
          })}`,
        );

        return result;
      });
    } catch (error) {
      if (isDuplicateWebhookEventError(error)) {
        this.logger.warn(
          `Skipping duplicate RevenueCat webhook event ${formatLogContext(eventContext)}`,
        );

        return { duplicate: true, updated: false, skippedReason: 'duplicate' };
      }

      this.logger.error(
        `RevenueCat webhook transaction failed ${formatLogContext(eventContext)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  private async applyWebhookEvent(
    tx: Prisma.TransactionClient,
    event: RevenueCatWebhookEventDto,
  ): Promise<RevenueCatWebhookResult> {
    if (event.type === TRANSFER_REVENUECAT_EVENT) {
      return this.applyTransferEvent(tx, event);
    }

    const eventContext = getEventLogContext(event);
    const eventTimestampAt = getEventTimestampDate(event);
    const nextStatus = mapRevenueCatStatus(event.type);

    if (!nextStatus) {
      this.logger.warn(
        `Skipping RevenueCat webhook with unsupported event type ${formatLogContext(eventContext)}`,
      );

      return { duplicate: false, updated: false, skippedReason: 'unsupported_event' };
    }

    const nextPlan = mapRevenueCatPlan(getEffectiveProductId(event));

    if (!nextPlan) {
      this.logger.warn(
        `Skipping RevenueCat webhook with unsupported product ${formatLogContext(eventContext)}`,
      );

      return { duplicate: false, updated: false, skippedReason: 'unsupported_product' };
    }

    const primaryRevenueCatUserId = getPrimaryRevenueCatUserId(event);

    if (!primaryRevenueCatUserId) {
      this.logger.warn(
        `Skipping RevenueCat webhook with missing user identifier ${formatLogContext(eventContext)}`,
      );

      return { duplicate: false, updated: false, skippedReason: 'missing_required_field' };
    }

    const expirationDate = getExpirationDate(event);

    if (!expirationDate) {
      this.logger.warn(
        `Skipping RevenueCat webhook with missing expiration ${formatLogContext(eventContext)}`,
      );

      return { duplicate: false, updated: false, skippedReason: 'missing_required_field' };
    }

    this.logger.log(
      `Mapped RevenueCat webhook event ${formatLogContext({
        ...eventContext,
        primaryRevenueCatUserId,
        nextStatus,
        nextPlan,
      })}`,
    );

    const user = await this.findUserByRevenueCatUserId(tx, primaryRevenueCatUserId);

    if (!user) {
      this.logger.warn(`RevenueCat webhook user not found ${formatLogContext(eventContext)}`);

      return { duplicate: false, updated: false, skippedReason: 'user_not_found' };
    }

    this.logger.log(
      `Loaded user for RevenueCat webhook ${formatLogContext({
        ...eventContext,
        userId: user.id,
        existingSubscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null,
        existingRevenueCatLastEventAt: user.revenuecatLastEventAt?.toISOString() ?? null,
      })}`,
    );

    if (isStaleEvent(user.revenuecatLastEventAt, eventTimestampAt)) {
      this.logger.warn(
        `Skipping stale RevenueCat webhook event ${formatLogContext({
          ...eventContext,
          userId: user.id,
          existingRevenueCatLastEventAt: user.revenuecatLastEventAt?.toISOString() ?? null,
          incomingEventTimestampAt: eventTimestampAt.toISOString(),
        })}`,
      );

      return { duplicate: false, updated: false, skippedReason: 'stale_event' };
    }

    this.logger.log(
      `Updating user subscription from RevenueCat webhook ${formatLogContext({
        ...eventContext,
        userId: user.id,
        primaryRevenueCatUserId,
        nextStatus,
        nextPlan,
        subscriptionExpiry: expirationDate.toISOString(),
        revenueCatLastEventAt: eventTimestampAt.toISOString(),
      })}`,
    );

    await tx.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: nextStatus,
        subscriptionPlan: nextPlan,
        subscriptionExpiry: expirationDate,
        revenuecatAppUserId: primaryRevenueCatUserId,
        revenuecatLastEventAt: eventTimestampAt,
      },
    });

    this.logger.log(
      `Updated user subscription from RevenueCat webhook ${formatLogContext({
        ...eventContext,
        userId: user.id,
        primaryRevenueCatUserId,
        nextStatus,
        nextPlan,
        subscriptionExpiry: expirationDate.toISOString(),
        revenueCatLastEventAt: eventTimestampAt.toISOString(),
      })}`,
    );

    return { duplicate: false, updated: true };
  }

  private async applyTransferEvent(
    tx: Prisma.TransactionClient,
    event: RevenueCatWebhookEventDto,
  ): Promise<RevenueCatWebhookResult> {
    const eventContext = getEventLogContext(event);
    const eventTimestampAt = getEventTimestampDate(event);
    const destinationRevenueCatUserId = getPrimaryRevenueCatUserId(event);
    const nextPlan = mapRevenueCatPlan(getEffectiveProductId(event));
    const expirationDate = getExpirationDate(event);

    if (!destinationRevenueCatUserId || !nextPlan || !expirationDate) {
      this.logger.warn(
        `Skipping RevenueCat transfer with missing required fields ${formatLogContext({
          ...eventContext,
          destinationRevenueCatUserId,
          nextPlan,
          expirationDate: expirationDate?.toISOString() ?? null,
        })}`,
      );

      return {
        duplicate: false,
        updated: false,
        skippedReason: !nextPlan ? 'unsupported_product' : 'missing_required_field',
      };
    }

    const destinationUser = await this.findUserByRevenueCatUserId(tx, destinationRevenueCatUserId);
    const sourceRevenueCatUserIds = event.transferred_from.filter(
      (userId) => userId !== destinationRevenueCatUserId,
    );

    this.logger.log(
      `Processing RevenueCat transfer event ${formatLogContext({
        ...eventContext,
        destinationRevenueCatUserId,
        sourceRevenueCatUserIds,
        nextPlan,
        subscriptionExpiry: expirationDate.toISOString(),
      })}`,
    );

    let updated = false;

    if (sourceRevenueCatUserIds.length > 0) {
      const revokedUsers = await tx.user.updateMany({
        where: {
          AND: [
            {
              OR: [
                { id: { in: sourceRevenueCatUserIds } },
                { revenuecatAppUserId: { in: sourceRevenueCatUserIds } },
              ],
            },
            {
              OR: [
                { revenuecatLastEventAt: null },
                { revenuecatLastEventAt: { lte: eventTimestampAt } },
              ],
            },
          ],
        },
        data: {
          subscriptionStatus: 'expired',
          subscriptionPlan: null,
          subscriptionExpiry: null,
          revenuecatAppUserId: null,
          revenuecatLastEventAt: eventTimestampAt,
        },
      });

      updated = revokedUsers.count > 0;

      this.logger.log(
        `Revoked source subscriptions for RevenueCat transfer ${formatLogContext({
          ...eventContext,
          sourceRevenueCatUserIds,
          revokedUserCount: revokedUsers.count,
          revenueCatLastEventAt: eventTimestampAt.toISOString(),
        })}`,
      );
    }

    if (!destinationUser) {
      this.logger.warn(
        `RevenueCat transfer destination user not found ${formatLogContext({
          ...eventContext,
          destinationRevenueCatUserId,
        })}`,
      );

      if (updated) {
        return { duplicate: false, updated: true };
      }

      return { duplicate: false, updated: false, skippedReason: 'user_not_found' };
    }

    this.logger.log(
      `Loaded transfer destination user for RevenueCat webhook ${formatLogContext({
        ...eventContext,
        userId: destinationUser.id,
        destinationRevenueCatUserId,
        existingSubscriptionExpiry: destinationUser.subscriptionExpiry?.toISOString() ?? null,
        existingRevenueCatLastEventAt: destinationUser.revenuecatLastEventAt?.toISOString() ?? null,
      })}`,
    );

    if (isStaleEvent(destinationUser.revenuecatLastEventAt, eventTimestampAt)) {
      this.logger.warn(
        `Skipping stale RevenueCat transfer destination update ${formatLogContext({
          ...eventContext,
          userId: destinationUser.id,
          destinationRevenueCatUserId,
          existingRevenueCatLastEventAt:
            destinationUser.revenuecatLastEventAt?.toISOString() ?? null,
          incomingEventTimestampAt: eventTimestampAt.toISOString(),
        })}`,
      );

      if (updated) {
        return { duplicate: false, updated: true };
      }

      return { duplicate: false, updated: false, skippedReason: 'stale_event' };
    }

    await tx.user.update({
      where: { id: destinationUser.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: nextPlan,
        subscriptionExpiry: expirationDate,
        revenuecatAppUserId: destinationRevenueCatUserId,
        revenuecatLastEventAt: eventTimestampAt,
      },
    });

    this.logger.log(
      `Granted destination subscription for RevenueCat transfer ${formatLogContext({
        ...eventContext,
        userId: destinationUser.id,
        destinationRevenueCatUserId,
        nextPlan,
        subscriptionExpiry: expirationDate.toISOString(),
        revenueCatLastEventAt: eventTimestampAt.toISOString(),
      })}`,
    );

    return { duplicate: false, updated: true };
  }

  private async findUserByRevenueCatUserId(
    tx: Prisma.TransactionClient,
    revenueCatUserId: string,
  ): Promise<SubscriptionUser | null> {
    return tx.user.findFirst({
      where: {
        OR: [{ id: revenueCatUserId }, { revenuecatAppUserId: revenueCatUserId }],
      },
      select: subscriptionUserSelect,
    });
  }
}
