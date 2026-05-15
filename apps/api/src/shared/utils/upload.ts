export interface UploadedImageFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
}

export const MAX_PHOTO_UPLOAD_SIZE = 5 * 1024 * 1024;
export const MAX_PHOTO_BASE64_SIZE = 10 * 1024 * 1024;
