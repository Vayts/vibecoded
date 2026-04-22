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
  result?: BarcodeLookupResponse;
  resolvedPersonalResult?: AnalysisJobResponse;
  detailState?: {
    isLoading: boolean;
    isError: boolean;
  };
}

export function ScannerResultSheetContent({
  scanId,
  item,
  previewProduct,
  result,
  resolvedPersonalResult,
  detailState,
}: ScannerResultSheetContentProps) {
  if (scanId) {
    return (
      <ScanDetailLoader
        scanId={scanId}
        previewItem={item}
        previewProduct={previewProduct}
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
        detailState={detailState}
      />
    );
  }

  return null;
}
