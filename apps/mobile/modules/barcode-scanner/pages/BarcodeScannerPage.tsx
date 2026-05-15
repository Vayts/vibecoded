import React from 'react';
import { CameraView } from 'expo-camera';
import { View } from 'react-native';
import { BarcodeScannerBottomBar } from '../components/BarcodeScannerBottomBar';
import { BarcodeScannerFocusFrame } from '../components/BarcodeScannerFocusFrame';
import { BarcodeScannerPermissionState } from '../components/BarcodeScannerPermissionState';
import { BarcodeScannerProcessingOverlay } from '../components/BarcodeScannerProcessingOverlay';
import { BarcodeScannerTopBar } from '../components/BarcodeScannerTopBar';
import { useBarcodeScannerController } from '../hooks/useBarcodeScannerController';
import type { BarcodeScannerRouteMode } from '../types/barcodeScanner';
import { getBarcodeScannerStatusMessage } from '../utils/statusMessage';

interface BarcodeScannerPageProps {
  routeMode?: BarcodeScannerRouteMode;
}

export function BarcodeScannerPage({ routeMode = 'default' }: BarcodeScannerPageProps) {
  const {
    barcodeMutation,
    compareMutation,
    firstProduct,
    handleBarcodeScanned,
    handleCameraPermissionPress,
    handleCancelCompare,
    handleCloseScanner,
    insets,
    isAppActive,
    isCompareMode,
    isLocked,
    isResolvingFirstProduct,
    isScannerPaused,
    isScreenFocused,
    isTorchEnabled,
    pendingBarcode,
    permission,
    scanFrameBounds,
    scanFrameRef,
    shouldReturnAfterCompareCancel,
    toggleTorch,
  } = useBarcodeScannerController({ routeMode });

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    const isCameraPermissionBlocked = !permission.canAskAgain;
    return (
      <BarcodeScannerPermissionState
        title={isCameraPermissionBlocked ? 'Turn on camera access' : 'Camera access required'}
        description={
          isCameraPermissionBlocked
            ? 'Camera access is turned off for this app. Enable it in Settings to scan barcodes and take photos.'
            : 'We’ll need access to your camera to scan barcodes and take photos.'
        }
        buttonLabel={isCameraPermissionBlocked ? 'Open Settings' : 'Allow camera'}
        onClose={handleCloseScanner}
        onPress={handleCameraPermissionPress}
      />
    );
  }

  const isProcessing = barcodeMutation.isPending || compareMutation.isPending || isResolvingFirstProduct;
  const statusMessage = getBarcodeScannerStatusMessage({
    isBarcodePending: barcodeMutation.isPending,
    isComparePending: compareMutation.isPending,
    isResolvingFirstProduct,
  });
  const shouldSuspendCameraView = !isAppActive || !isScreenFocused || isScannerPaused;
  const scannerHintMessage = pendingBarcode
    ? 'Scan the same barcode again to confirm'
    : 'Align the barcode inside the frame';

  return (
    <View className="flex-1 bg-black">
      {!shouldSuspendCameraView ? (
        <CameraView
          active
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          enableTorch={isTorchEnabled}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          style={{ flex: 1 }}
        />
      ) : null}
      {!isAppActive || !isScreenFocused || isScannerPaused ? (
        <View pointerEvents="none" className="absolute inset-0 bg-black" />
      ) : null}
      {isLocked && isProcessing ? <BarcodeScannerProcessingOverlay statusMessage={statusMessage} /> : null}

      <View
        pointerEvents="box-none"
        className="absolute inset-0 px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }}
      >
        <BarcodeScannerTopBar
          isCompareMode={isCompareMode && Boolean(firstProduct)}
          isLocked={isLocked}
          isTorchEnabled={isTorchEnabled}
          shouldReturnAfterCompareCancel={shouldReturnAfterCompareCancel}
          onClose={handleCloseScanner}
          onCancelCompare={handleCancelCompare}
          onToggleTorch={toggleTorch}
        />

        <View className="flex-1 items-center justify-center pb-12">
          {!isLocked ? (
            <BarcodeScannerFocusFrame
              frameRef={scanFrameRef}
              hintMessage={scannerHintMessage}
              onFrameMeasured={(bounds) => {
                scanFrameBounds.current = bounds;
              }}
            />
          ) : null}
        </View>

        <BarcodeScannerBottomBar
          isCompareMode={isCompareMode && Boolean(firstProduct)}
          onCancelCompare={handleCancelCompare}
        />
      </View>
    </View>
  );
}



