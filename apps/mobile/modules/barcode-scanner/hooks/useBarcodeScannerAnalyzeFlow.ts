import type { ProductLookupResponse, ProductPreview } from '@acme/shared';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useScanBarcodeMutation } from '../../scanner/hooks/useScannerMutations';
import { useScannerSheets } from '../../scanner/hooks/useScannerSheets';
import {
  buildCompletedAnalysisJob,
  buildCompletedBarcodeLookupResponse,
} from '../../scanner/utils/scannerResultBuilders';

interface UseBarcodeScannerAnalyzeFlowInput {
  pauseScanner: () => void;
  resumeScanner: () => void;
}

const buildPreviewProduct = (
  barcode: string,
  result: ProductLookupResponse,
): ProductPreview => ({
  productId: result.product.productId,
  barcode,
  product_name: result.product.product_name,
  product_name_english: result.product.product_name_english ?? null,
  brands: result.product.brands,
  image_url: result.product.image_url,
  nutriscore_grade: result.product.nutriscore_grade ?? null,
});

export const useBarcodeScannerAnalyzeFlow = ({
  pauseScanner,
  resumeScanner,
}: UseBarcodeScannerAnalyzeFlowInput) => {
  const router = useRouter();
  const barcodeAnalysisMutation = useScanBarcodeMutation();
  const [isScannerErrorSheetOpen, setIsScannerErrorSheetOpen] = useState(false);
  const isTransitioningToErrorSheetRef = useRef(false);

  const switchToPhotoMode = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      router.push('/scanner/photo');
    });
  }, [router]);

  const { beginResultSheetSession, handleResultSheetError, hydrateResultSession } = useScannerSheets({
    isScannerErrorSheetOpen,
    isTransitioningToErrorSheetRef,
    pauseScannerForErrorSheet: pauseScanner,
    resumeScanner,
    setIsScannerErrorSheetOpen,
    switchToPhotoMode,
  });

  const analyzeProduct = useCallback(
    async (input: { barcode: string; lookupResult: ProductLookupResponse }) => {
      pauseScanner();
      const sessionId = beginResultSheetSession(
        buildPreviewProduct(input.barcode, input.lookupResult),
      );

      try {
        const result = await barcodeAnalysisMutation.mutateAsync({ barcode: input.barcode });
        hydrateResultSession(sessionId, {
          result: buildCompletedBarcodeLookupResponse({
            barcode: input.barcode,
            source: 'openfoodfacts',
            result,
          }),
          resolvedPersonalResult: buildCompletedAnalysisJob(result),
        });
      } catch (error) {
        await handleResultSheetError(error, 'Unable to analyze product');
      }
    },
    [
      barcodeAnalysisMutation,
      beginResultSheetSession,
      handleResultSheetError,
      hydrateResultSession,
      pauseScanner,
    ],
  );

  return {
    analyzeProduct,
  };
};
