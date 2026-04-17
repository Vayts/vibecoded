import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthSessionService } from '../../shared/auth/auth-session.service';
import { ApiError } from '../../shared/errors/api-error';
import { getStoredObject } from '../product-analyze/lib/storage';
import { MAX_PHOTO_UPLOAD_SIZE } from '../scanner-photo/scanner-photo.constants';
import type { UploadedPhotoFile } from '../scanner-photo/scanner-photo.schemas';
import { StorageService } from './storage.service';

const IMAGE_FILENAME_PATTERN = /^[\w.-]+$/;

@Controller('api/storage')
export class StorageController {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly storageService: StorageService,
  ) {}

  @Get('products/:filename')
  async getProductImage(
    @Param('filename') filename: string,
    @Res() response: Response,
  ): Promise<void> {
    await this.streamImage(`/products/${filename}`, filename, response);
  }

  @Get('avatars/:filename')
  async getAvatarImage(
    @Param('filename') filename: string,
    @Res() response: Response,
  ): Promise<void> {
    await this.streamImage(`/avatars/${filename}`, filename, response);
  }

  @Post('avatars')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: MAX_PHOTO_UPLOAD_SIZE },
    }),
  )
  async uploadAvatar(@UploadedFile() file: UploadedPhotoFile | undefined, @Req() request: Request) {
    await this.authSessionService.requireUserId(request);
    return this.storageService.uploadAvatar(file);
  }

  private async streamImage(
    objectPath: string,
    filename: string,
    response: Response,
  ): Promise<void> {
    if (!filename || !IMAGE_FILENAME_PATTERN.test(filename)) {
      throw ApiError.badRequest('Invalid filename', 'VALIDATION_ERROR');
    }

    const object = await getStoredObject(objectPath);

    if (!object) {
      throw ApiError.notFound('Image not found', 'IMAGE_NOT_FOUND');
    }

    response.setHeader('Content-Type', object.contentType);
    response.setHeader('Content-Length', String(object.size));
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    await new Promise<void>((resolve, reject) => {
      object.stream.on('error', reject);
      response.on('finish', resolve);
      response.on('close', resolve);
      object.stream.pipe(response);
    });
  }
}
