import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { SCANNER_PHOTO_ROUTE_BASE } from './scanner-photo.constants';
import { ScannerPhotoService } from './scanner-photo.service';
import { MAX_PHOTO_UPLOAD_SIZE } from './scanner-photo.constants';
import type { UploadedPhotoFile } from './scanner-photo.schemas';

@Controller(SCANNER_PHOTO_ROUTE_BASE)
export class ScannerPhotoController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly scannerPhotoService: ScannerPhotoService,
  ) {}

  @Post('photo/ocr')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE },
    }),
  )
  extractPhotoOcr(@Body() body: unknown, @UploadedFile() file?: UploadedPhotoFile) {
    return this.scannerPhotoService.extractPhotoOcr(body, file);
  }

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE },
    }),
  )
  async submitPhotoScan(
    @Body() body: unknown,
    @UploadedFile() file: UploadedPhotoFile | undefined,
    @Req() request: Request,
  ) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.scannerPhotoService.submitPhotoScan(body, userId, file);
  }
}
