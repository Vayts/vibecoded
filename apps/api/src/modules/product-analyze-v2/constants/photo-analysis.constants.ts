export { MAX_PHOTO_BASE64_SIZE, MAX_PHOTO_UPLOAD_SIZE } from '../../../shared/utils/upload.js';

export const PHOTO_FILE_REQUIRED_ERROR = 'photo file is required';
export const INVALID_OCR_FIELD_ERROR = 'Invalid ocr field';
export const IMAGE_TOO_LARGE_ERROR = 'Image too large';
export const INVALID_PHOTO_FILE_ERROR = 'Invalid photo file';

export const PRODUCT_ANALYZE_V2_AI_MODELS = {
  vision: 'gpt-5.4-mini',
  geminiVision: 'gemini-3.1-flash-lite', // gemini-2.5-flash-lite TODO
  reason: 'gpt-5.4-mini',
} as const;
