import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_ROUTE_BASE } from './auth.constants';
import { AuthService } from './auth.service';

@Controller(AUTH_ROUTE_BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All()
  handleBase(@Req() request: Request, @Res() response: Response) {
    return this.authService.handle(request, response);
  }

  @All('*path')
  handleNested(@Req() request: Request, @Res() response: Response) {
    return this.authService.handle(request, response);
  }
}
