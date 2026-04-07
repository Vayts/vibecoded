import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { SCANNER_PHOTO_ROUTE_BASE } from './scanner-photo.constants';
import { ScannerPhotoService } from './scanner-photo.service';

@Controller(SCANNER_PHOTO_ROUTE_BASE)
export class ScannerPhotoController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly scannerPhotoService: ScannerPhotoService,
  ) {}

  @Post('photo/ocr')
  extractPhotoOcr(@Body() body: unknown) {
    return this.scannerPhotoService.extractPhotoOcr(body);
  }

  @Post('photo')
  async submitPhotoScan(@Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.scannerPhotoService.submitPhotoScan(body, userId);
  }
}
