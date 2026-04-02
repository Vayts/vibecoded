import sharp from 'sharp';

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

const MAX_DIMENSION = 1500;
const JPEG_QUALITY = 80;

/**
 * Process a product image: normalize orientation, resize, compress to JPEG.
 * Accepts a raw buffer (from base64 decode) and returns an optimized JPEG buffer.
 */
export const processProductImage = async (inputBuffer: Buffer): Promise<ProcessedImage> => {
  const startedAt = Date.now();
  console.log(
    `[image-processing] start bytes=${inputBuffer.length} maxDimension=${MAX_DIMENSION} jpegQuality=${JPEG_QUALITY}`,
  );

  const result = await sharp(inputBuffer)
    .rotate() // auto-rotate based on EXIF orientation
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  console.log(
    `[image-processing] done width=${result.info.width} height=${result.info.height} format=${result.info.format} outputBytes=${result.info.size} reduction=${Math.max(inputBuffer.length - result.info.size, 0)} elapsed=${Date.now() - startedAt}ms`,
  );

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    format: result.info.format,
    sizeBytes: result.info.size,
  };
};
