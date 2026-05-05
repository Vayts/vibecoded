import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service.js';
import { MAX_PHOTO_UPLOAD_SIZE } from './constants/photo-analysis.constants.js';
import { ProductAnalyzeV2Service } from './product-analyze-v2.service.js';
import type {
  AnalyzePhotoV2Response,
  UploadedPhotoFileV2,
} from './types/analyze-photo-v2.types.js';
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

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE },
    }),
  )
  async analyzePhoto(
    @Body() body: unknown,
    @UploadedFile() file: UploadedPhotoFileV2 | undefined,
    @Req() request: Request,
  ): Promise<AnalyzePhotoV2Response> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.productAnalyzeV2Service.analyzePhoto(body, userId, file);
  }
}
