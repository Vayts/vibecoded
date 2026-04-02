import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1500;
const JPEG_QUALITY = 0.8;

interface CompressedImage {
  uri: string;
  base64: string;
}

/**
 * Compress and resize an image for upload.
 * Resizes to max 1500px on the longest side, JPEG 80% quality.
 * Returns the compressed URI and base64-encoded string.
 */
export async function compressImage(
  uri: string,
  width: number,
  height: number,
): Promise<CompressedImage> {
  const longestSide = Math.max(width, height);
  const actions =
    longestSide > MAX_DIMENSION
      ? [width >= height ? { resize: { width: MAX_DIMENSION } } : { resize: { height: MAX_DIMENSION } }]
      : [];

  const result = await manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('Image compression failed');
  }

  return { uri: result.uri, base64: result.base64 };
}
