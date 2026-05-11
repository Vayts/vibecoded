import type {
  BarcodeLookupResponse,
  PersonalAnalysisJob,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';
import type { ProductResultDetailState } from './DetailStateContent';
import { ProductResultContent } from './ProductResultContent';
import { ScanDetailLoader } from './ScanDetailLoader';

interface ScannerResultSheetContentProps {
  scanId?: string;
  item?: ScanHistoryItem;
  photoUri?: string;
  previewProduct?: ProductPreview;
  result?: BarcodeLookupResponse;
  resolvedPersonalResult?: PersonalAnalysisJob;
  detailState?: ProductResultDetailState;
  onBeforeErrorSheetOpen?: () => void;
  onErrorSheetDismiss?: () => void;
}

export function ScannerResultSheetContent({
  scanId,
  item,
  photoUri,
  previewProduct,
  result,
  resolvedPersonalResult,
  detailState,
  onBeforeErrorSheetOpen,
  onErrorSheetDismiss,
}: ScannerResultSheetContentProps) {
  if (scanId) {
    return <ScanDetailLoader scanId={scanId} previewItem={item} previewProduct={previewProduct} />;
  }

  if (result || previewProduct || item || detailState?.isLoading || detailState?.isError) {
    return (
      <ProductResultContent
        previewItem={item}
        result={result}
        scanId={scanId}
        photoUri={photoUri}
        previewProduct={previewProduct}
        resolvedPersonalResult={resolvedPersonalResult}
        detailState={detailState}
        onBeforeErrorSheetOpen={onBeforeErrorSheetOpen}
        onErrorSheetDismiss={onErrorSheetDismiss}
      />
    );
  }

  return null;
}
