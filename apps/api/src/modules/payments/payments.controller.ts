import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { PaymentsService, type PaymentsWebhookResponse } from './payments.service';

@Controller('webhooks')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('revenuecat')
  async handleRevenueCatWebhook(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body() body: unknown,
  ): Promise<PaymentsWebhookResponse> {
    const hasAuthorizationHeader = Boolean(authorizationHeader);
    this.logger.log(
      `Received RevenueCat webhook request ${JSON.stringify({ hasAuthorizationHeader })}`,
    );

    const result = await this.paymentsService.handleRevenueCatWebhook(authorizationHeader, body);

    this.logger.log(
      `Completed RevenueCat webhook request ${JSON.stringify({
        hasAuthorizationHeader,
        duplicate: result.duplicate,
        updated: result.updated,
        skippedReason: result.skippedReason ?? null,
      })}`,
    );

    return result;
  }
}

