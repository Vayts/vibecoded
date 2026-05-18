import { useState } from 'react';
import type { CapturedProductPhoto, PackagePhotoMissingField } from '../types/productPhotoCapture';
import { usePackagePhotosUploadMutation } from './useBarcodeScannerMutations';
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
  const packagePhotosMutation = usePackagePhotosUploadMutation();
  const { hydrateAnalysisSheet, openAnalysisSheet } = usePackagePhotoAnalysisSheet({ onCompleted });
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

    try {
      const result = await packagePhotosMutation.mutateAsync({
        barcode: normalizedBarcode,
        photos,
      });

      if (isNeedsMorePhotosResponse(result)) {
        flow.requestMissingFieldsStep(result.missingFields);
        setSubmissionError(result.message);
        return;
      }

      const sessionId = openAnalysisSheet(normalizedBarcode, photos);
      hydrateAnalysisSheet(sessionId, result);
    } catch (error) {
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
    isProcessing: packagePhotosMutation.isPending,
    submissionError,
  };
};
