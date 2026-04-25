import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RevenueCatService } from './revenuecat/revenuecat.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RevenueCatService],
})
export class PaymentsModule {}

