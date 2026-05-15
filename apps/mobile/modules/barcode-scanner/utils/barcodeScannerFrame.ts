import { Dimensions } from 'react-native';

export interface BarcodeScannerFrameBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BarcodeBoundsLike {
  origin: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export const BARCODE_FRAME_WIDTH = Math.min(Dimensions.get('window').width - 48, 300);
export const BARCODE_FRAME_HEIGHT = 200;
export const BARCODE_DETECTION_PADDING = 20;

export const isBarcodeWithinFrame = (
  bounds: BarcodeBoundsLike,
  frame: BarcodeScannerFrameBounds,
): boolean => {
  const centerX = bounds.origin.x + bounds.size.width / 2;
  const centerY = bounds.origin.y + bounds.size.height / 2;

  return (
    centerX >= frame.x - BARCODE_DETECTION_PADDING &&
    centerX <= frame.x + frame.w + BARCODE_DETECTION_PADDING &&
    centerY >= frame.y - BARCODE_DETECTION_PADDING &&
    centerY <= frame.y + frame.h + BARCODE_DETECTION_PADDING
  );
};

