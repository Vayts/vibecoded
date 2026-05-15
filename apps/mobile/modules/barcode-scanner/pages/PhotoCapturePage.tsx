import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../shared/components/BackButton';
import { Typography } from '../../../shared/components/Typography';
import { BarcodeScannerPermissionState } from '../components/BarcodeScannerPermissionState';
import { ProductPhotoCaptureControls } from '../components/ProductPhotoCaptureControls';
import { ProductPhotoPreviewActions } from '../components/ProductPhotoPreviewActions';
import { ProductPhotoProgress } from '../components/ProductPhotoProgress';
import { ProductPhotoStepHint } from '../components/ProductPhotoStepHint';
import {
  usePackagePhotoCoverageMutation,
  usePackagePhotosUploadMutation,
} from '../hooks/useBarcodeScannerMutations';
import { usePackagePhotoResultSheet } from '../hooks/usePackagePhotoResultSheet';
import { useProductPhotoCaptureFlow } from '../hooks/useProductPhotoCaptureFlow';
import type { CapturedProductPhoto, PackagePhotoMissingField } from '../types/productPhotoCapture';

const FALLBACK_MISSING_FIELDS: PackagePhotoMissingField[] = ['nutritionFacts', 'ingredients'];
const NUTRITION_MISSING_FIELDS: PackagePhotoMissingField[] = ['nutritionFacts'];
const INGREDIENTS_MISSING_FIELDS: PackagePhotoMissingField[] = ['ingredients'];

export function PhotoCapturePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const flow = useProductPhotoCaptureFlow();
  const coverageMutation = usePackagePhotoCoverageMutation();
  const packagePhotosMutation = usePackagePhotosUploadMutation();
  const { showPackagePhotoResult } = usePackagePhotoResultSheet();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const closePhotoGuide = () => {
    router.back();
  };

  const uploadPackagePhotos = async (photos: CapturedProductPhoto[] | null) => {
    if (!photos?.length || packagePhotosMutation.isPending) {
      return;
    }

    setSubmissionError(null);

    try {
      const result = await packagePhotosMutation.mutateAsync(photos);
      await showPackagePhotoResult(result.extraction, () => router.back());
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to upload product photos');
    }
  };

  const handleUsePhoto = () => {
    void (async () => {
      const pendingPhoto = flow.pendingPhoto;
      const acceptedPhotos = flow.acceptPendingPhoto();

      if (!acceptedPhotos?.length || !pendingPhoto) {
        return;
      }

      if (pendingPhoto.step !== 'back') {
        await uploadPackagePhotos(acceptedPhotos);
        return;
      }

      setSubmissionError(null);

      try {
        const coverage = await coverageMutation.mutateAsync(pendingPhoto);

        if (coverage.coverage === 1) {
          await uploadPackagePhotos(acceptedPhotos);
          return;
        }

        if (coverage.coverage === 0) {
          setSubmissionError(
            'We couldn’t read nutrition facts or ingredients. Please retake the back photo.',
          );
          flow.retakePendingPhoto();
          return;
        }

        flow.requestMissingPanelStep(
          coverage.coverage === 2 ? NUTRITION_MISSING_FIELDS : INGREDIENTS_MISSING_FIELDS,
        );
      } catch {
        setSubmissionError('We need one more photo to finish reading the package.');
        flow.requestMissingPanelStep(FALLBACK_MISSING_FIELDS);
      }
    })();
  };

  const handleSkipOptionalStep = () => {
    void uploadPackagePhotos(flow.skipOptionalStep());
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

  const previewUri = flow.pendingPhoto?.uri;
  const errorMessage = submissionError ?? flow.errorMessage;
  const isProcessing = packagePhotosMutation.isPending || coverageMutation.isPending;

  return (
    <View className="flex-1 bg-black">
      {flow.mode === 'camera' ? (
        <CameraView active facing="back" mode="picture" ref={flow.cameraRef} style={{ flex: 1 }} />
      ) : null}
      {flow.mode === 'preview' && previewUri ? (
        <Image source={{ uri: previewUri }} className="absolute inset-0 h-full w-full" />
      ) : null}

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

        {flow.mode === 'preview' ? (
          <ProductPhotoPreviewActions
            isSubmitting={isProcessing}
            onRetake={flow.retakePendingPhoto}
            onUsePhoto={handleUsePhoto}
            usePhotoLabel={coverageMutation.isPending ? 'Checking…' : undefined}
          />
        ) : (
          <ProductPhotoCaptureControls
            isCapturing={flow.isCapturing}
            isSubmitting={isProcessing}
            step={flow.currentStep}
            onCapture={flow.capturePhoto}
            onSkipOptional={handleSkipOptionalStep}
          />
        )}
      </View>
    </View>
  );
}
