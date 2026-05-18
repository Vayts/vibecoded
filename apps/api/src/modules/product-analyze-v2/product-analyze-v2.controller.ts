import type { ProductLookupResponse } from '@acme/shared';
import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service.js';
import { MAX_PHOTO_UPLOAD_SIZE } from './constants/photo-analysis.constants.js';
import { ProductAnalyzeV2Service } from './product-analyze-v2.service.js';
import type {
  AnalyzePhotoV2Response,
  PackagePhotoCoverageCode,
  UploadedPhotoFileV2,
} from './types/analyze-photo-v2.types.js';
import type {
  AnalyzeBarcodeV2Response,
  CompareProductsV2Response,
} from './types/analyze-product-v2.types.js';

interface CompareProductsV2UploadedFiles {
  photoA?: UploadedPhotoFileV2[];
  photoB?: UploadedPhotoFileV2[];
}

@Controller('product-analysis')
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

  @Post('barcode/lookup')
  async lookupBarcode(
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<ProductLookupResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.productAnalyzeV2Service.lookupBarcode(body, userId);
  }

  @Post('compare')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photoA', maxCount: 1 },
        { name: 'photoB', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE } },
    ),
  )
  async compareProducts(
    @Body() body: unknown,
    @UploadedFiles() files: CompareProductsV2UploadedFiles | undefined,
    @Req() request: Request,
  ): Promise<CompareProductsV2Response> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.productAnalyzeV2Service.compareProducts(body, userId, files);
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

  @Post('package-photos/coverage')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE },
    }),
  )
  async checkPackagePhotoCoverage(
    @Body() body: unknown,
    @UploadedFile() file: UploadedPhotoFileV2 | undefined,
    @Req() request: Request,
  ): Promise<PackagePhotoCoverageCode> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.productAnalyzeV2Service.checkPackagePhotoCoverage(body, userId, file);
  }

  @Post('package-photos')
  @UseInterceptors(
    FilesInterceptor('photos', 3, {
      limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE },
    }),
  )
  async uploadPackagePhotos(
    @Body() body: unknown,
    @UploadedFiles() files: UploadedPhotoFileV2[] | undefined,
    @Req() request: Request,
  ): Promise<AnalyzePhotoV2Response> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.productAnalyzeV2Service.uploadPackagePhotos(body, userId, files);
  }
}
