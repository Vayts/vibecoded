import { Injectable } from '@nestjs/common';
import type { UploadedPhotoFile } from '../scanner-photo/scanner-photo.schemas';
import { ApiError } from '../../shared/errors/api-error';
import { processProductImage } from '../product-analyze/lib/image-processing';
import { uploadAvatarImage } from '../product-analyze/lib/storage';

@Injectable()
export class StorageService {
  async uploadAvatar(file?: UploadedPhotoFile) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw ApiError.badRequest('Avatar file is required', 'VALIDATION_ERROR');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw ApiError.badRequest('Invalid avatar file', 'VALIDATION_ERROR');
    }

    const processed = await processProductImage(file.buffer);
    const path = await uploadAvatarImage(processed.buffer);

    return { path };
  }
}
