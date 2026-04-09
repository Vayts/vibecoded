import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { ScanDetailResponse, ScanHistoryResponse } from '@acme/shared';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { SCANS_ROUTE_BASE } from './scans.constants';
import { ScansService } from './scans.service';

@Controller(SCANS_ROUTE_BASE)
export class ScansController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly scansService: ScansService,
  ) {}

  @Get('history')
  async getHistory(
    @Req() request: Request,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ScanHistoryResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.scansService.getHistory(userId, cursor, limit, search);
  }

  @Get(':id')
  async getDetail(
    @Param('id') scanId: string,
    @Req() request: Request,
  ): Promise<ScanDetailResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.scansService.getDetail(userId, scanId);
  }
}
