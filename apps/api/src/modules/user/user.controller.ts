import { Body, Controller, Delete, Get, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { USER_ROUTE_BASE } from './user.constants';
import type { SerializedUser, UserSubscriptionResponse } from './user.service';
import { UserService } from './user.service';

@Controller(USER_ROUTE_BASE)
export class UserController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly userService: UserService,
  ) {}

  @Get()
  async getCurrentUser(@Req() request: Request): Promise<SerializedUser> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.userService.getCurrentUser(userId);
  }

  @Patch()
  async updateProfile(@Body() body: unknown, @Req() request: Request): Promise<SerializedUser> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.userService.updateProfile(userId, body);
  }

  @Get('subscription')
  async getSubscription(@Req() request: Request): Promise<UserSubscriptionResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.userService.getSubscription(userId);
  }

  @Delete()
  async remove(@Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.userService.remove(userId);
  }
}
