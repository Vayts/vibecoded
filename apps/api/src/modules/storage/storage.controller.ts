import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiError } from '../../shared/errors/api-error';
import { getStoredObject } from '../product-analyze/lib/storage';

const PRODUCT_IMAGE_FILENAME_PATTERN = /^[\w.-]+$/;

@Controller('api/storage')
export class StorageController {
  @Get('products/:filename')
  async getProductImage(
    @Param('filename') filename: string,
    @Res() response: Response,
  ): Promise<void> {
    if (!filename || !PRODUCT_IMAGE_FILENAME_PATTERN.test(filename)) {
      throw ApiError.badRequest('Invalid filename', 'VALIDATION_ERROR');
    }

    const object = await getStoredObject(`/products/${filename}`);

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