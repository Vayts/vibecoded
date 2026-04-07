import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { SCANNER_ROUTE_BASE } from './scanner.constants';
import { ScannerService } from './scanner.service';

@Controller(SCANNER_ROUTE_BASE)
export class ScannerController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly scannerService: ScannerService,
  ) {}

  @Post('barcode')
  async submitBarcodeScan(@Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.getOptionalUserId(request);
    return this.scannerService.submitBarcodeScan(body, userId);
  }

  @Post('lookup')
  lookupProduct(@Body() body: unknown) {
    return this.scannerService.lookupProduct(body);
  }

  @Post('compare')
  async compareProducts(@Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.scannerService.compareProducts(body, userId);
  }
}
