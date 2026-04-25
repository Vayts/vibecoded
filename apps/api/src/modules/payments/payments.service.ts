import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiError } from '../../shared/errors/api-error';
import { revenueCatWebhookSchema } from './revenuecat/dto/revenuecat-webhook.dto';
import { RevenueCatService, type RevenueCatWebhookResult } from './revenuecat/revenuecat.service';

export interface PaymentsWebhookResponse extends RevenueCatWebhookResult {
  received: true;
}

const formatLogContext = (context: Record<string, unknown>): string => {
  return JSON.stringify(context);
};

const getWebhookRequestContext = (body: unknown): Record<string, unknown> => {
  if (typeof body !== 'object' || body === null) {
    return { bodyType: typeof body };
  }

  const payload = body as Record<string, unknown>;
  const event =
    typeof payload.event === 'object' && payload.event !== null
      ? (payload.event as Record<string, unknown>)
      : null;

  return {
    bodyType: 'object',
    apiVersion: typeof payload.api_version === 'string' ? payload.api_version : null,
    eventId: typeof event?.id === 'string' ? event.id : null,
    eventType: typeof event?.type === 'string' ? event.type : null,
    appUserId: typeof event?.app_user_id === 'string' ? event.app_user_id : null,
    originalAppUserId:
      typeof event?.original_app_user_id === 'string' ? event.original_app_user_id : null,
    productId: typeof event?.product_id === 'string' ? event.product_id : null,
    newProductId: typeof event?.new_product_id === 'string' ? event.new_product_id : null,
    expirationAtMs:
      typeof event?.expiration_at_ms === 'number' || typeof event?.expiration_at_ms === 'string'
        ? event.expiration_at_ms
        : null,
    eventTimestampMs:
      typeof event?.event_timestamp_ms === 'number' || typeof event?.event_timestamp_ms === 'string'
        ? event.event_timestamp_ms
        : null,
    transferredFrom: Array.isArray(event?.transferred_from) ? event.transferred_from : [],
    transferredTo: Array.isArray(event?.transferred_to) ? event.transferred_to : [],
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly revenueCatService: RevenueCatService) {}

  async handleRevenueCatWebhook(
    authorizationHeader: string | undefined,
    body: unknown,
  ): Promise<PaymentsWebhookResponse> {
    const requestContext = getWebhookRequestContext(body);

    this.logger.log(`Processing RevenueCat webhook ${formatLogContext(requestContext)}`);
    this.validateRevenueCatAuthorization(authorizationHeader, requestContext);

    const parsed = revenueCatWebhookSchema.safeParse(body);

    if (!parsed.success) {
      this.logger.warn(
        `RevenueCat webhook payload validation failed ${formatLogContext({
          ...requestContext,
          issueCount: parsed.error.issues.length,
          firstIssue: parsed.error.issues[0]?.message ?? null,
        })}`,
      );

      throw ApiError.badRequest(
        parsed.error.issues[0]?.message ?? 'Invalid RevenueCat webhook payload',
      );
    }

    this.logger.log(
      `RevenueCat webhook payload validated ${formatLogContext({
        apiVersion: parsed.data.api_version ?? null,
        eventId: parsed.data.event.id,
        eventType: parsed.data.event.type,
        appUserId: parsed.data.event.app_user_id,
        productId: parsed.data.event.product_id,
        newProductId: parsed.data.event.new_product_id ?? null,
        expirationAtMs: parsed.data.event.expiration_at_ms,
        eventTimestampMs: parsed.data.event.event_timestamp_ms,
        transferredFrom: parsed.data.event.transferred_from,
        transferredTo: parsed.data.event.transferred_to,
      })}`,
    );

    const result = await this.revenueCatService.handleWebhook(parsed.data);

    this.logger.log(
      `RevenueCat webhook processed ${formatLogContext({
        eventId: parsed.data.event.id,
        eventType: parsed.data.event.type,
        appUserId: parsed.data.event.app_user_id,
        duplicate: result.duplicate,
        updated: result.updated,
        skippedReason: result.skippedReason ?? null,
      })}`,
    );

    return {
      received: true,
      ...result,
    };
  }

  private validateRevenueCatAuthorization(
    authorizationHeader: string | undefined,
    requestContext: Record<string, unknown>,
  ): void {
    const expectedAuthorization = process.env.REVENUECAT_WEBHOOK_AUTH;

    if (!expectedAuthorization) {
      this.logger.error(
        `RevenueCat webhook auth is not configured ${formatLogContext(requestContext)}`,
      );

      throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, {
        error: 'RevenueCat webhook auth is not configured',
        code: 'WEBHOOK_NOT_CONFIGURED',
      });
    }

    if (authorizationHeader !== expectedAuthorization) {
      this.logger.warn(
        `RevenueCat webhook authorization failed ${formatLogContext({
          ...requestContext,
          hasAuthorizationHeader: Boolean(authorizationHeader),
        })}`,
      );

      throw ApiError.unauthorized('Invalid RevenueCat webhook authorization');
    }

    this.logger.log(
      `RevenueCat webhook authorization validated ${formatLogContext({
        ...requestContext,
        hasAuthorizationHeader: true,
      })}`,
    );
  }
}
