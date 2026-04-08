import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1500;
const JPEG_QUALITY = 0.8;

interface CompressedImage {
  uri: string;
}

export async function compressImage(
  uri: string,
  width: number,
  height: number,
): Promise<CompressedImage> {
  const longestSide = Math.max(width, height);
  const actions =
    longestSide > MAX_DIMENSION
      ? [
          width >= height
            ? { resize: { width: MAX_DIMENSION } }
            : { resize: { height: MAX_DIMENSION } },
        ]
      : [];

  const result = await manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return { uri: result.uri };
}