import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service.js';
import { ProductAnalyzeV2Service } from './product-analyze-v2.service.js';
import type { AnalyzeBarcodeV2Response } from './types/analyze-product-v2.types.js';

@Controller('product-analyze-v2')
export class ProductAnalyzeV2Controller {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly productAnalyzeV2Service: ProductAnalyzeV2Service,
  ) {}

  @Post('barcode')
  async analyzeBarcode(
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AnalyzeBarcodeV2Response> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.productAnalyzeV2Service.analyzeBarcode(body, userId);
  }
}
