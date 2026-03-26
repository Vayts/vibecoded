import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { PhotoScanPendingContent } from './PhotoScanPendingContent';
import { ProductResultContent } from './ProductResultContent';
import { isBarcodeLookupResponse } from './productResultHelpers';

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const { errorMessage, origin, phase, previewImageUri, presentationMode, reset, result } =
    useScannerResultSheetStore();
  const resolvedOrigin = payload?.origin === 'photo' ? origin ?? 'photo' : payload?.origin;
  const resolvedPresentationMode =
    payload?.origin === 'photo' ? presentationMode : payload?.presentationMode;
  const resolvedPreviewImageUri = payload?.origin === 'photo' ? previewImageUri : payload?.previewImageUri;
  const resolvedResult = payload?.origin === 'photo' ? result : payload?.result;
  const isBarcodeResult = isBarcodeLookupResponse(resolvedResult);

  const handleClose = () => {
    reset();
    void SheetManager.hide(SheetsEnum.ScannerResultSheet);
  };

  return (
    <ActionSheet gestureEnabled onClose={reset}>
      <View className="px-6 pb-2">
        {isBarcodeResult ? (
          <ProductResultContent
            result={resolvedResult}
            previewImageUri={resolvedPreviewImageUri}
            presentationMode={resolvedPresentationMode}
            origin={resolvedOrigin}
          />
        ) : payload?.origin === 'photo' && phase !== 'idle' ? (
          <PhotoScanPendingContent
            previewImageUri={resolvedPreviewImageUri}
            errorMessage={phase === 'error' ? errorMessage : null}
          />
        ) : null}

        <View className="border-t border-gray-100 pt-4 mt-2">
          <Button
            fullWidth
            label="Close"
            onPress={handleClose}
          />
        </View>
      </View>
    </ActionSheet>
  );
}
