import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ProductResultContent } from './ProductResultContent';
import { isBarcodeLookupResponse, isPhotoCaptureResponse } from './productResultHelpers';

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const result = payload?.result;
  const isPhotoResult = isPhotoCaptureResponse(result);
  const isBarcodeResult = isBarcodeLookupResponse(result);

  return (
    <ActionSheet gestureEnabled>
      <View className="px-6 pb-8">
        {isPhotoResult ? (
          <View className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
            <View className="mb-3 flex-row items-center gap-2">
              <Sparkles color={COLORS.sparkle} size={18} />
              <Typography variant="fieldLabel" className="text-gray-500">
                Photo status
              </Typography>
            </View>
            <Typography variant="body" className="leading-6 text-gray-700">
              {isPhotoResult ? result.message : 'Product photo was sent to AI'}
            </Typography>
          </View>
        ) : isBarcodeResult ? (
          <ProductResultContent result={result} />
        ) : null}

        <View className="mt-6">
          <Button
            fullWidth
            label="Close"
            onPress={() => {
              void SheetManager.hide(SheetsEnum.ScannerResultSheet);
            }}
          />
        </View>
      </View>
    </ActionSheet>
  );
}
