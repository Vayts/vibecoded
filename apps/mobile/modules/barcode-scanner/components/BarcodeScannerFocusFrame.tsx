import type { RefObject } from 'react';
import { View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';
import {
  BARCODE_FRAME_HEIGHT,
  BARCODE_FRAME_WIDTH,
  type BarcodeScannerFrameBounds,
} from '../utils/barcodeScannerFrame';

interface BarcodeScannerFocusFrameProps {
  frameRef: RefObject<View | null>;
  hintMessage: string;
  onFrameMeasured: (bounds: BarcodeScannerFrameBounds) => void;
}

export function BarcodeScannerFocusFrame({
  frameRef,
  hintMessage,
  onFrameMeasured,
}: BarcodeScannerFocusFrameProps) {
  return (
    <View className="items-center">
      <View className="mb-5 rounded-xl px-4 py-2" style={{ backgroundColor: COLORS.overlayStrong }}>
        <Typography variant="bodySecondary" className="text-center text-white">
          {hintMessage}
        </Typography>
      </View>

      <View
        ref={frameRef}
        className="rounded-[32px] border-2 border-white/80 bg-white/5"
        style={{ width: BARCODE_FRAME_WIDTH, height: BARCODE_FRAME_HEIGHT }}
        onLayout={() => {
          frameRef.current?.measureInWindow((x, y, width, height) => {
            onFrameMeasured({ x, y, w: width, h: height });
          });
        }}
      />
    </View>
  );
}


