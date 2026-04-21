import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query, Req } from '@nestjs/common';
import type { ComparisonDetailResponse, ComparisonHistoryResponse } from '@acme/shared';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { parseComparisonFilters } from '../../shared/utils/history-filters';
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
    @Query('profileIds') profileIds?: string,
  ): Promise<ComparisonHistoryResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    const filters = parseComparisonFilters(profileIds);
    return this.comparisonsService.getHistory(userId, cursor, limit, search, filters);
  }

  @Get(':id')
  async getDetail(
    @Param('id') comparisonId: string,
    @Req() request: Request,
  ): Promise<ComparisonDetailResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.comparisonsService.getDetail(userId, comparisonId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComparison(
    @Param('id') comparisonId: string,
    @Req() request: Request,
  ): Promise<void> {
    const userId = await this.authSessionService.requireUserId(request);
    await this.comparisonsService.deleteComparison(userId, comparisonId);
  }
}
