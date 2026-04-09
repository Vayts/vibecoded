import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type {
  ComparisonDetailResponse,
  ComparisonHistoryResponse,
} from '@acme/shared';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { COMPARISONS_ROUTE_BASE } from './comparisons.constants';
import { ComparisonsService } from './comparisons.service';

@Controller(COMPARISONS_ROUTE_BASE)
export class ComparisonsController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly comparisonsService: ComparisonsService,
  ) {}

  @Get()
  async getHistory(
    @Req() request: Request,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ComparisonHistoryResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.comparisonsService.getHistory(userId, cursor, limit, search);
  }

  @Get(':id')
  async getDetail(
    @Param('id') comparisonId: string,
    @Req() request: Request,
  ): Promise<ComparisonDetailResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.comparisonsService.getDetail(userId, comparisonId);
  }
}
