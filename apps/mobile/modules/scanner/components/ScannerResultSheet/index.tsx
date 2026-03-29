import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { ProductResultContent } from './ProductResultContent';
import { isBarcodeLookupResponse } from './productResultHelpers';

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const reset = useScannerResultSheetStore((s) => s.reset);
  const resolvedResult = payload?.result;
  const isBarcodeResult = isBarcodeLookupResponse(resolvedResult);

  const handleClose = () => {
    reset();
    void SheetManager.hide(SheetsEnum.ScannerResultSheet);
  };

  return (
    <ActionSheet gestureEnabled onClose={reset}>
      <View className="px-6 pb-2">
        {isBarcodeResult ? (
          <ProductResultContent result={resolvedResult} />
        ) : null}

        <View className="mt-2 border-t border-gray-100 pt-4">
          <Button fullWidth label="Close" onPress={handleClose} />
        </View>
      </View>
    </ActionSheet>
  );
}
