import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { FavouritesResponse } from '@acme/shared';
import type { Request } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { FAVOURITES_ROUTE_BASE } from './favourites.constants';
import { FavouritesService } from './favourites.service';

@Controller(FAVOURITES_ROUTE_BASE)
export class FavouritesController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly favouritesService: FavouritesService,
  ) {}

  @Get()
  async getFavourites(
    @Req() request: Request,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<FavouritesResponse> {
    const userId = await this.authSessionService.requireUserId(request);
    return this.favouritesService.getFavourites(userId, cursor, limit, search);
  }

  @Post()
  async addFavourite(@Body() body: unknown, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.favouritesService.addFavourite(userId, body);
  }

  @Delete(':productId')
  async removeFavourite(@Param('productId') productId: string, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.favouritesService.removeFavourite(userId, productId);
  }

  @Get('status/:productId')
  async getFavouriteStatus(@Param('productId') productId: string, @Req() request: Request) {
    const userId = await this.authSessionService.requireUserId(request);
    return this.favouritesService.getFavouriteStatus(userId, productId);
  }
}
