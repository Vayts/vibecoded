import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';
import { ProductResultContent } from './ProductResultContent';
import { ScanDetailLoader } from './ScanDetailLoader';

interface ScannerResultSheetContentProps {
  scanId?: string;
  item?: ScanHistoryItem;
  previewProduct?: ProductPreview;
  snapIndex: number;
  result?: BarcodeLookupResponse;
  resolvedPersonalResult?: AnalysisJobResponse;
  isLoadingInitialResult: boolean;
  onExpandDetails: () => void;
  onPreviewStateChange: (state: {
    hasSummaryContent: boolean;
    nutriScoreGrade: string | null | undefined;
  }) => void;
  detailState?: {
    isLoading: boolean;
    isError: boolean;
  };
}

export function ScannerResultSheetContent({
  scanId,
  item,
  previewProduct,
  snapIndex,
  result,
  resolvedPersonalResult,
  isLoadingInitialResult,
  onExpandDetails,
  onPreviewStateChange,
  detailState,
}: ScannerResultSheetContentProps) {
  if (scanId) {
    return (
      <ScanDetailLoader
        scanId={scanId}
        previewItem={item}
        previewProduct={previewProduct}
        snapIndex={snapIndex}
        onExpandDetails={onExpandDetails}
        onPreviewStateChange={onPreviewStateChange}
      />
    );
  }

  if (result || previewProduct || item) {
    return (
      <ProductResultContent
        previewItem={item}
        result={result}
        scanId={scanId}
        previewProduct={previewProduct}
        resolvedPersonalResult={resolvedPersonalResult}
        isInitialLoadingResult={!scanId && isLoadingInitialResult}
        snapIndex={snapIndex}
        onExpandDetails={onExpandDetails}
        onPreviewStateChange={onPreviewStateChange}
        detailState={detailState}
      />
    );
  }

  return null;
}
