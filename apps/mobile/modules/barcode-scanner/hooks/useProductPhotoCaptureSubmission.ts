import { useState } from 'react';
import type { CapturedProductPhoto, PackagePhotoMissingField } from '../types/productPhotoCapture';
import {
  usePackagePhotoCoverageMutation,
  usePackagePhotosUploadMutation,
} from './useBarcodeScannerMutations';
import { usePackagePhotoAnalysisSheet } from './usePackagePhotoAnalysisSheet';

const FALLBACK_MISSING_FIELDS: PackagePhotoMissingField[] = ['nutritionFacts', 'ingredients'];

type PackagePhotoCoverageCode = 0 | 1 | 2 | 3;

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
  barcode: string;
  flow: ProductPhotoCaptureFlow;
  onCompleted: () => void;
}

export const useProductPhotoCaptureSubmission = ({
  barcode,
  flow,
  onCompleted,
}: ProductPhotoCaptureSubmissionOptions) => {
  const coverageMutation = usePackagePhotoCoverageMutation();
  const packagePhotosMutation = usePackagePhotosUploadMutation();
  const { closeAnalysisSheetAfterError, hydrateAnalysisSheet, openAnalysisSheet } =
    usePackagePhotoAnalysisSheet({ onCompleted });
  const [frontCoverage, setFrontCoverage] = useState<PackagePhotoCoverageCode | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const uploadPackagePhotos = async (photos: CapturedProductPhoto[] | null) => {
    const normalizedBarcode = barcode.trim();

    if (!photos?.length || packagePhotosMutation.isPending) {
      return;
    }

    if (!normalizedBarcode) {
      setSubmissionError('Barcode is missing. Please scan the barcode again.');
      return;
    }

    setSubmissionError(null);
    const sessionId = openAnalysisSheet(normalizedBarcode, photos);

    try {
      const result = await packagePhotosMutation.mutateAsync({
        barcode: normalizedBarcode,
        photos,
      });
      hydrateAnalysisSheet(sessionId, result);
    } catch (error) {
      await closeAnalysisSheetAfterError();
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







