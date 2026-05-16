import { useState } from 'react';
import type { CapturedProductPhoto, PackagePhotoMissingField } from '../types/productPhotoCapture';
import { usePackagePhotoResultSheet } from './usePackagePhotoResultSheet';
import {
  usePackagePhotoCoverageMutation,
  usePackagePhotosUploadMutation,
} from './useBarcodeScannerMutations';

const FALLBACK_MISSING_FIELDS: PackagePhotoMissingField[] = ['nutritionFacts', 'ingredients'];

type PackagePhotoCoverageCode = 0 | 1 | 2 | 3;
type PackagePhotoExtraction = Parameters<
  ReturnType<typeof usePackagePhotoResultSheet>['showPackagePhotoResult']
>[0];

interface ProductPhotoCaptureFlow {
  acceptCapturedPhoto: (photo: CapturedProductPhoto) => CapturedProductPhoto[] | null;
  capturePhoto: () => Promise<CapturedProductPhoto | null>;
  requestMissingPanelStep: (missing: PackagePhotoMissingField[]) => void;
  skipOptionalStep: () => CapturedProductPhoto[] | null;
}

const hasNutritionFacts = (coverage: PackagePhotoCoverageCode | null) =>
  coverage === 1 || coverage === 3;

const hasIngredients = (coverage: PackagePhotoCoverageCode | null) =>
  coverage === 1 || coverage === 2;

const getMissingFields = (
  frontCoverage: PackagePhotoCoverageCode | null,
  currentCoverage: PackagePhotoCoverageCode,
): PackagePhotoMissingField[] => {
  const missingFields: PackagePhotoMissingField[] = [];

  if (!hasNutritionFacts(frontCoverage) && !hasNutritionFacts(currentCoverage)) {
    missingFields.push('nutritionFacts');
  }

  if (!hasIngredients(frontCoverage) && !hasIngredients(currentCoverage)) {
    missingFields.push('ingredients');
  }

  return missingFields;
};

interface ProductPhotoCaptureSubmissionOptions {
  flow: ProductPhotoCaptureFlow;
  onCompleted: () => void;
}

export const useProductPhotoCaptureSubmission = ({
  flow,
  onCompleted,
}: ProductPhotoCaptureSubmissionOptions) => {
  const coverageMutation = usePackagePhotoCoverageMutation();
  const packagePhotosMutation = usePackagePhotosUploadMutation();
  const { showPackagePhotoResult } = usePackagePhotoResultSheet();
  const [frontCoverage, setFrontCoverage] = useState<PackagePhotoCoverageCode | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const uploadPackagePhotos = async (photos: CapturedProductPhoto[] | null) => {
    if (!photos?.length || packagePhotosMutation.isPending) {
      return;
    }

    setSubmissionError(null);

    try {
      const result = await packagePhotosMutation.mutateAsync(photos);
      const extractionResult = result as unknown as { extraction: PackagePhotoExtraction };
      await showPackagePhotoResult(extractionResult.extraction, onCompleted);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to upload product photos');
    }
  };

  const handleFrontPhoto = async (photo: CapturedProductPhoto) => {
    setSubmissionError(null);

    try {
      const coverage = (await coverageMutation.mutateAsync(photo)) as unknown as PackagePhotoCoverageCode;
      setFrontCoverage(coverage);

      if (coverage === 1) {
        await uploadPackagePhotos([photo]);
        return;
      }
    } catch {
      // Front coverage is only an optimization. If it fails, continue the normal flow.
    }

    flow.acceptCapturedPhoto(photo);
  };

  const handleBackPhoto = async (photo: CapturedProductPhoto) => {
    setSubmissionError(null);

    try {
      const coverage = (await coverageMutation.mutateAsync(photo)) as unknown as PackagePhotoCoverageCode;
      const hasCompleteCoverage =
        (hasNutritionFacts(frontCoverage) || hasNutritionFacts(coverage)) &&
        (hasIngredients(frontCoverage) || hasIngredients(coverage));

      if (hasCompleteCoverage) {
        const photos = flow.acceptCapturedPhoto(photo);
        await uploadPackagePhotos(photos);
        return;
      }

      if (coverage === 0 && !hasNutritionFacts(frontCoverage) && !hasIngredients(frontCoverage)) {
        setSubmissionError(
          'We couldn’t read nutrition facts or ingredients. Please retake the back photo.',
        );
        return;
      }

      const missingFields = getMissingFields(frontCoverage, coverage);
      flow.acceptCapturedPhoto(photo);
      flow.requestMissingPanelStep(missingFields.length ? missingFields : FALLBACK_MISSING_FIELDS);
    } catch {
      flow.acceptCapturedPhoto(photo);
      setSubmissionError('We need one more photo to finish reading the package.');
      flow.requestMissingPanelStep(FALLBACK_MISSING_FIELDS);
    }
  };

  const handleCapturePhoto = () => {
    void (async () => {
      const capturedPhoto = await flow.capturePhoto();

      if (!capturedPhoto) {
        return;
      }

      if (capturedPhoto.step === 'front') {
        await handleFrontPhoto(capturedPhoto);
        return;
      }

      if (capturedPhoto.step === 'back') {
        await handleBackPhoto(capturedPhoto);
        return;
      }

      const acceptedPhotos = flow.acceptCapturedPhoto(capturedPhoto);
      await uploadPackagePhotos(acceptedPhotos);
    })();
  };

  const handleSkipOptionalStep = () => {
    void uploadPackagePhotos(flow.skipOptionalStep());
  };

  return {
    handleCapturePhoto,
    handleSkipOptionalStep,
    isCheckingCoverage: coverageMutation.isPending,
    isProcessing: packagePhotosMutation.isPending || coverageMutation.isPending,
    submissionError,
  };
};







