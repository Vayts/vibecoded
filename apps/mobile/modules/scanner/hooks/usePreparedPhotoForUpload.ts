import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';

const MAX_UPLOAD_EDGE_PX = 1500;
const UPLOAD_JPEG_QUALITY = 0.8;

interface PreparePhotoForUploadInput {
  uri: string;
  fileName?: string;
  width?: number;
  height?: number;
}

interface PreparedPhotoForUpload {
  uri: string;
  fileName: string;
  mimeType: string;
}

const getResizedDimensions = (width?: number, height?: number) => {
  if (!width || !height) {
    return null;
  }

  const longestEdge = Math.max(width, height);
  if (longestEdge <= MAX_UPLOAD_EDGE_PX) {
    return null;
  }

  if (width >= height) {
    return { width: MAX_UPLOAD_EDGE_PX };
  }

  return { height: MAX_UPLOAD_EDGE_PX };
};

const normalizeFileName = (fileName?: string) => {
  const baseName = fileName?.trim() ? fileName.trim().replace(/\.[^.]+$/, '') : 'product-photo';
  return `${baseName}.jpg`;
};

export const usePreparedPhotoForUpload = () => {
  return async ({ fileName, height, uri, width }: PreparePhotoForUploadInput) => {
    const normalizedFileName = normalizeFileName(fileName);

    try {
      const resize = getResizedDimensions(width, height);
      const manipulated = await manipulateAsync(
        uri,
        resize ? [{ resize }] : [],
        {
          compress: UPLOAD_JPEG_QUALITY,
          format: SaveFormat.JPEG,
        },
      );

      return {
        uri: manipulated.uri,
        fileName: normalizedFileName,
        mimeType: 'image/jpeg',
      } satisfies PreparedPhotoForUpload;
    } catch {
      return {
        uri,
        fileName: normalizedFileName,
        mimeType: 'image/jpeg',
      } satisfies PreparedPhotoForUpload;
    }
  };
};