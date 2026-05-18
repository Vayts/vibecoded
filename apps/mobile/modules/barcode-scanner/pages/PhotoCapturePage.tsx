import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../shared/components/BackButton';
import { Typography } from '../../../shared/components/Typography';
import { BarcodeScannerPermissionState } from '../components/BarcodeScannerPermissionState';
import { ProductPhotoCaptureControls } from '../components/ProductPhotoCaptureControls';
import { ProductPhotoProgress } from '../components/ProductPhotoProgress';
import { ProductPhotoStepHint } from '../components/ProductPhotoStepHint';
import { useProductPhotoCaptureSubmission } from '../hooks/useProductPhotoCaptureSubmission';
import { useProductPhotoCaptureFlow } from '../hooks/useProductPhotoCaptureFlow';

export function PhotoCapturePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const flow = useProductPhotoCaptureFlow();
  const barcode = Array.isArray(params.barcode) ? params.barcode[0] : params.barcode;
  const submission = useProductPhotoCaptureSubmission({
    barcode: barcode ?? '',
    flow,
    onCompleted: () => router.back(),
  });

  const closePhotoGuide = () => {
    router.back();
  };

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
            ? 'Camera access is turned off for this app. Enable it in Settings to add product photos.'
            : 'We’ll need access to your camera to add product photos.'
        }
        buttonLabel={isCameraPermissionBlocked ? 'Open Settings' : 'Allow camera'}
        onClose={closePhotoGuide}
        onPress={requestPermission}
      />
    );
  }

  const errorMessage = submission.submissionError ?? flow.errorMessage;

  return (
    <View className="flex-1 bg-black">
      <CameraView active facing="back" mode="picture" ref={flow.cameraRef} style={{ flex: 1 }} />

      <View
        pointerEvents="box-none"
        className="absolute inset-0 px-4"
        style={{ paddingBottom: insets.bottom + 24, paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center">
          <BackButton
            variant="dark"
            icon="close"
            accessibilityLabel="Close product photo guide"
            onPress={closePhotoGuide}
          />
          <View className="flex-1 items-center pr-11">
            <Typography variant="buttonSmall" className="text-white">
              Add product photos
            </Typography>
          </View>
        </View>

        <View className="mt-2">
          <ProductPhotoStepHint
            activeStepIndex={flow.activeStepIndex}
            step={flow.currentStep}
            totalSteps={flow.totalSteps}
          />
          <ProductPhotoProgress
            activeStepIndex={flow.activeStepIndex}
            capturedPhotos={flow.capturedPhotos}
            totalSteps={flow.totalSteps}
          />
          {errorMessage ? (
            <Typography variant="bodySecondary" className="mt-2 text-center text-white">
              {errorMessage}
            </Typography>
          ) : null}
        </View>

        <View className="flex-1" />

        <ProductPhotoCaptureControls
          isCapturing={flow.isCapturing}
          isSubmitting={submission.isProcessing}
          processingLabel={submission.isCheckingCoverage ? 'Checking…' : undefined}
          step={flow.currentStep}
          onCapture={submission.handleCapturePhoto}
          onSkipOptional={submission.handleSkipOptionalStep}
        />
      </View>
    </View>
  );
}
