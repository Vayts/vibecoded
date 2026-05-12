import { Injectable } from '@nestjs/common';
import { ApiError } from '../../shared/errors/api-error';
import { processProductImage } from '../../shared/lib/image-processing';
import { uploadAvatarImage } from '../../shared/lib/storage';
import type { UploadedImageFile } from '../../shared/utils/upload';

@Injectable()
export class StorageService {
  async uploadAvatar(file?: UploadedImageFile) {
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
