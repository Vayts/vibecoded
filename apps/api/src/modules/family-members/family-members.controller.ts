import { Body, Controller, Delete, Get, Param, Post, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { FAMILY_MEMBERS_ROUTE_BASE } from './family-members.constants';
import { FamilyMembersService } from './family-members.service';

@Controller(FAMILY_MEMBERS_ROUTE_BASE)
export class FamilyMembersController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly familyMembersService: FamilyMembersService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.familyMembersService.list(userId);
  }

  @Post()
  async create(@Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.familyMembersService.create(userId, body);
  }

  @Patch(':id')
  async update(@Param('id') memberId: string, @Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.familyMembersService.update(userId, memberId, body);
  }

  @Delete(':id')
  async remove(@Param('id') memberId: string, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.familyMembersService.remove(userId, memberId);
  }
}
