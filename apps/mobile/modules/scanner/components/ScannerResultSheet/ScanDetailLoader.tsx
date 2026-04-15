import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  ScanDetailResponse,
} from '@acme/shared';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useScanDetailQuery } from '../../../scans/hooks/useScanHistoryQuery';
import type { ScannerResultSheetPayload } from '../../types/scanner';
import { DetailStateContent } from './DetailStateContent';
import { ProductResultContent } from './ProductResultContent';
import { ScanDeleteAction } from './ScanDeleteAction';

function buildResultFromScanDetail(scan: ScanDetailResponse): {
  result: BarcodeLookupResponse;
  resolvedPersonalResult: AnalysisJobResponse;
} {
  const status = scan.personalAnalysisStatus ?? 'completed';
  const productStatus = scan.analysisResult
    ? 'completed'
    : status === 'failed'
      ? 'failed'
      : 'pending';

  return {
    result: {
      success: true,
      barcode: scan.barcode ?? '',
      source: 'openfoodfacts',
      product: scan.product!,
      personalAnalysis: {
        analysisId: scan.analysisId ?? scan.id,
        status,
        productStatus,
        ingredientsStatus: status,
        result: scan.analysisResult ?? undefined,
      },
      scanId: scan.id,
      productId: scan.productId ?? undefined,
      isFavourite: scan.isFavourite,
    },
    resolvedPersonalResult: {
      analysisId: scan.analysisId ?? scan.id,
      status,
      productStatus,
      ingredientsStatus: status,
      result: scan.analysisResult ?? undefined,
    },
  };
}

interface ScanDetailLoaderProps {
  scanId: string;
  previewItem?: ScannerResultSheetPayload['item'];
  previewProduct?: ScannerResultSheetPayload['previewProduct'];
  previewImageUri?: ScannerResultSheetPayload['previewImageUri'];
  snapIndex: number;
  onExpandDetails: () => void;
}

export function ScanDetailLoader({
  scanId,
  previewItem,
  previewProduct,
  previewImageUri,
  snapIndex,
  onExpandDetails,
}: ScanDetailLoaderProps) {
  const { data, isLoading, isError, error, refetch } = useScanDetailQuery(scanId);
  const safeAreaInsets = useSafeAreaInsets();

  const mapped = useMemo(
    () => (data?.product ? buildResultFromScanDetail(data) : null),
    [data],
  );
  const hasPreviewState = Boolean(previewItem?.product || previewProduct || mapped?.result);

  if (!hasPreviewState && isLoading) {
    return (
      <View
        className="items-center justify-center px-6 py-12"
        style={{ paddingBottom: safeAreaInsets.bottom + 24 }}
      >
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Typography variant="bodySecondary" className="mt-3 text-gray-500">
          Loading product info…
        </Typography>
      </View>
    );
  }

  if (!hasPreviewState && isError) {
    return (
      <DetailStateContent
        detailState={{
          isLoading: false,
          isError: true,
          errorMessage: error?.message ?? 'Failed to load scan details',
          onRetry: () => void refetch(),
        }}
        bottomAction={<ScanDeleteAction scanId={scanId} />}
      />
    );
  }

  if (!mapped && !hasPreviewState) {
    return null;
  }

  return (
    <ProductResultContent
      previewItem={previewItem}
      result={mapped?.result}
      previewProduct={previewProduct}
      previewImageUri={previewImageUri}
      resolvedPersonalResult={mapped?.resolvedPersonalResult}
      snapIndex={snapIndex}
      onExpandDetails={onExpandDetails}
      detailState={
        mapped
          ? undefined
          : {
              isLoading,
              isError: !isLoading,
              errorMessage: error?.message ?? 'Failed to load scan details',
              onRetry: () => void refetch(),
            }
      }
    />
  );
}