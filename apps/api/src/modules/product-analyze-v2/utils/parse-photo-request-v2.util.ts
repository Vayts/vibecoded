import { z } from 'zod';
import { ApiError } from '../../../shared/errors/api-error.js';
import {
  IMAGE_TOO_LARGE_ERROR,
  INVALID_OCR_FIELD_ERROR,
  INVALID_PHOTO_FILE_ERROR,
  MAX_PHOTO_BASE64_SIZE,
  MAX_PHOTO_UPLOAD_SIZE,
  PHOTO_FILE_REQUIRED_ERROR,
} from '../constants/photo-analysis.constants.js';
import {
  photoOcrPayloadV2Schema,
  type UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import { toRawPhotoBodyV2 } from './photo-request.util.js';

export interface ParsedPhotoRequestV2 {
  imageBase64: string;
  ocr?: z.infer<typeof photoOcrPayloadV2Schema>;
}

const fileToBase64 = (file: UploadedPhotoFileV2): string => {
  if (!file.buffer || file.buffer.length === 0) {
    throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
  }

  if (file.size > MAX_PHOTO_UPLOAD_SIZE) {
    throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
  }

  if (!file.mimetype.startsWith('image/')) {
    throw ApiError.badRequest(INVALID_PHOTO_FILE_ERROR);
  }

  return file.buffer.toString('base64');
};

const getImageBase64 = (body: ReturnType<typeof toRawPhotoBodyV2>, file?: UploadedPhotoFileV2) => {
  if (file) {
    return fileToBase64(file);
  }

  if (typeof body.imageBase64 !== 'string' || body.imageBase64.length === 0) {
    throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
  }

  if (body.imageBase64.length > MAX_PHOTO_BASE64_SIZE) {
    throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
  }

  return body.imageBase64;
};

const parseRawOcr = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw ApiError.badRequest(INVALID_OCR_FIELD_ERROR);
  }
};

export const parsePhotoRequestV2 = (
  body: unknown,
  file?: UploadedPhotoFileV2,
): ParsedPhotoRequestV2 => {
  const request = toRawPhotoBodyV2(body);
  const imageBase64 = getImageBase64(request, file);
  const rawOcr = parseRawOcr(request.ocr);
  const parsedOcr = rawOcr == null ? null : photoOcrPayloadV2Schema.safeParse(rawOcr);

  if (parsedOcr && !parsedOcr.success) {
    throw ApiError.badRequest(INVALID_OCR_FIELD_ERROR);
  }

  return {
    imageBase64,
    ...(parsedOcr ? { ocr: parsedOcr.data } : {}),
  };
};
