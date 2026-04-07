import type {
  BarcodeLookupResponse,
  AnalysisJobResponse,
  ScanDetailResponse,
} from '@acme/shared';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import ActionSheet, { useSheetPayload } from 'react-native-actions-sheet';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScanDetailQuery } from '../../../scans/hooks/useScanHistoryQuery';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { ProductResultContent } from './ProductResultContent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function ScanDetailLoader({ scanId }: { scanId: string }) {
  const { data, isLoading, isError, error, refetch } = useScanDetailQuery(scanId);
  const safeAreaInsets = useSafeAreaInsets();

  const mapped = useMemo(
    () => (data?.product ? buildResultFromScanDetail(data) : null),
    [data],
  );

  if (isLoading) {
    return (
      <View className="items-center justify-center px-6 py-12" style={{ paddingBottom: safeAreaInsets.bottom + 24 }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Typography variant="bodySecondary" className="mt-3 text-gray-500">
            Loading product info…
          </Typography>
        </View>
    );
  }

  if (isError) {
    return (
      <View className="items-center justify-center px-4 py-12">
        <Typography variant="sectionTitle" className="text-center">
          Something went wrong
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center">
          {error?.message ?? 'Failed to load scan details'}
        </Typography>
        <View className="mt-4">
          <Button label="Retry" onPress={() => void refetch()} />
        </View>
      </View>
    );
  }

  if (!mapped) return null;

  return (
    <ProductResultContent
      result={mapped.result}
      resolvedPersonalResult={mapped.resolvedPersonalResult}
    />
  );
}

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const reset = useScannerResultSheetStore((s) => s.reset);
  const storeResult = useScannerResultSheetStore((s) => s.result);
  const storeResolvedPersonalResult = useScannerResultSheetStore(
    (s) => s.resolvedPersonalResult,
  );
  const resolvedResult = storeResult ?? payload?.result;
  const resolvedPersonalResult =
    storeResolvedPersonalResult ?? payload?.resolvedPersonalResult;
  const scanId = payload?.scanId;
  const previewProduct = payload?.previewProduct;
  const previewImageUri = payload?.previewImageUri;

  return (
    <ActionSheet gestureEnabled useBottomSafeAreaPadding={false} onClose={reset}>
      {scanId ? (
          <ScanDetailLoader scanId={scanId} />
        ) : resolvedResult || previewProduct ? (
          <ProductResultContent
            result={resolvedResult}
            previewProduct={previewProduct}
            previewImageUri={previewImageUri}
            resolvedPersonalResult={resolvedPersonalResult}
          />
        ) : null}
    </ActionSheet>
  );
}
