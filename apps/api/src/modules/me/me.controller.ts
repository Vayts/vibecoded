import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { ME_ROUTE_BASE } from './me.constants';
import { MeService } from './me.service';

@Controller(ME_ROUTE_BASE)
export class MeController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly meService: MeService,
  ) {}

  @Get('onboarding')
  async getOnboarding(@Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.meService.getOnboarding(userId);
  }

  @Post('onboarding')
  @HttpCode(200)
  async saveOnboarding(@Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.meService.saveOnboarding(userId, body);
  }
}
