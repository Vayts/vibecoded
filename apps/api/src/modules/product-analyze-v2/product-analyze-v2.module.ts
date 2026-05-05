import { Module } from '@nestjs/common';
import { ProductAnalyzeV2Controller } from './product-analyze-v2.controller.js';
import { ProductAnalyzeV2Service } from './product-analyze-v2.service.js';

@Module({
  controllers: [ProductAnalyzeV2Controller],
  providers: [ProductAnalyzeV2Service],
})
export class ProductAnalyzeV2Module {}
