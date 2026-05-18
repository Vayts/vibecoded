import { useState } from 'react';
import type { CapturedProductPhoto, PackagePhotoMissingField } from '../types/productPhotoCapture';
import {
  usePackagePhotosCoverageMutation,
  usePackagePhotosUploadMutation,
} from './useBarcodeScannerMutations';
import { usePackagePhotoAnalysisSheet } from './usePackagePhotoAnalysisSheet';
import type { PackagePhotosUploadResponse } from '../api/barcodeScannerMutations';

interface ProductPhotoCaptureFlow {
  acceptCapturedPhoto: (photo: CapturedProductPhoto) => CapturedProductPhoto[] | null;
  capturePhoto: () => Promise<CapturedProductPhoto | null>;
  requestMissingFieldsStep: (missing: PackagePhotoMissingField[]) => void;
  skipOptionalStep: () => CapturedProductPhoto[] | null;
}

const isNeedsMorePhotosResponse = (
  response: PackagePhotosUploadResponse,
): response is Extract<PackagePhotosUploadResponse, { status: 'needs_more_photos' }> => {
  return 'status' in response && response.status === 'needs_more_photos';
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
  const coverageMutation = usePackagePhotosCoverageMutation();
  const packagePhotosMutation = usePackagePhotosUploadMutation();
  const { closeAnalysisSheet, hydrateAnalysisSheet, openAnalysisSheet } = usePackagePhotoAnalysisSheet({
    onCompleted,
  });
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const uploadPackagePhotos = async (photos: CapturedProductPhoto[] | null) => {
    const normalizedBarcode = barcode.trim();

    if (!photos?.length || coverageMutation.isPending || packagePhotosMutation.isPending) {
      return;
    }

    if (!normalizedBarcode) {
      setSubmissionError('Barcode is missing. Please scan the barcode again.');
      return;
    }

    setSubmissionError(null);

    let didOpenAnalysisSheet = false;

    try {
      const coverage = await coverageMutation.mutateAsync({
        barcode: normalizedBarcode,
        photos,
      });

      if (coverage.status === 'needs_more_photos') {
        flow.requestMissingFieldsStep(coverage.missingFields);
        setSubmissionError(coverage.message ?? 'Add one more clear product photo.');
        return;
      }

      const sessionId = openAnalysisSheet(normalizedBarcode, photos);
      didOpenAnalysisSheet = true;
      const result = await packagePhotosMutation.mutateAsync({
        barcode: normalizedBarcode,
        photos,
      });

      if (isNeedsMorePhotosResponse(result)) {
        await closeAnalysisSheet();
        flow.requestMissingFieldsStep(result.missingFields);
        setSubmissionError(result.message);
        return;
      }

      hydrateAnalysisSheet(sessionId, result);
    } catch (error) {
      if (didOpenAnalysisSheet) {
        await closeAnalysisSheet();
      }
      setSubmissionError(
        error instanceof Error ? error.message : 'Unable to upload product photos',
      );
    }
  };

  const handleCapturePhoto = () => {
    void (async () => {
      const capturedPhoto = await flow.capturePhoto();

      if (!capturedPhoto) {
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
    isProcessing: coverageMutation.isPending || packagePhotosMutation.isPending,
    submissionError,
  };
};
