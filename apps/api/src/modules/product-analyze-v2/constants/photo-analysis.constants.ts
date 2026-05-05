export const MAX_PHOTO_UPLOAD_SIZE = 5 * 1024 * 1024;
export const MAX_PHOTO_BASE64_SIZE = 10 * 1024 * 1024;

export const PHOTO_FILE_REQUIRED_ERROR = 'photo file is required';
export const INVALID_OCR_FIELD_ERROR = 'Invalid ocr field';
export const IMAGE_TOO_LARGE_ERROR = 'Image too large';
export const INVALID_PHOTO_FILE_ERROR = 'Invalid photo file';

export const PRODUCT_ANALYZE_V2_AI_MODELS = {
  vision: 'gpt-5.4-mini',
  reason: 'gpt-5.4-mini',
} as const;
