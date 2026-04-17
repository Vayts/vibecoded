import { AlertTriangle, Camera, ScanBarcode } from 'lucide-react-native';
import { useRef } from 'react';
import ActionSheet, { useSheetPayload, SheetManager } from 'react-native-actions-sheet';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';

export interface ScannerErrorSheetPayload {
  variant?: 'generic' | 'not-found' | 'not-food' | 'same-product';
  title?: string;
  message: string;
  onDismiss?: () => void;
  onPhotoPress?: () => void;
}

export function ScannerErrorSheet() {
  const { variant = 'generic', title, message, onDismiss, onPhotoPress } = useSheetPayload(
    SheetsEnum.ScannerErrorSheet,
  );
  const isNotFound = variant === 'not-found';
  const isNotFood = variant === 'not-food';
  const isSameProduct = variant === 'same-product';
  const hasPhotoAction = Boolean(onPhotoPress);
  const actionTakenRef = useRef(false);

  const resolvedTitle = isNotFound
    ? (title ?? 'Product not found')
    : isNotFood
      ? 'This is not a food product'
      : isSameProduct
        ? (title ?? 'This is the same product')
      : (title ?? 'Something went wrong');
  const resolvedMessage =
    isNotFound && hasPhotoAction
      ? 'We couldn\'t find this product by barcode. Try scanning the barcode again or take a photo of the product instead.'
      : message;

  const handleClose = () => {
    void SheetManager.hide(SheetsEnum.ScannerErrorSheet);
  };

  const handlePhotoPress = () => {
    actionTakenRef.current = true;
    void SheetManager.hide(SheetsEnum.ScannerErrorSheet);
  };

  const handleSheetClose = () => {
    if (actionTakenRef.current) {
      onPhotoPress?.();
    } else {
      onDismiss?.();
    }
    actionTakenRef.current = false;
  };

  return (
    <ActionSheet gestureEnabled useBottomSafeAreaPadding onClose={handleSheetClose}>
      <View className="items-center px-6 pb-4 pt-6">
        <View
          className={`mb-4 h-14 w-14 items-center justify-center rounded-full ${isNotFound || isSameProduct ? 'bg-amber-100' : 'bg-red-100'}`}
        >
          <AlertTriangle color={isNotFound || isSameProduct ? COLORS.warning : COLORS.danger} size={28} />
        </View>

        <Typography variant="sectionTitle" className="mb-2 text-center">
          {resolvedTitle}
        </Typography>

        <Typography variant="bodySecondary" className="mb-6 text-center text-gray-500">
          {resolvedMessage}
        </Typography>

        {isNotFound && hasPhotoAction ? (
          <View className="w-full gap-3">
            <TouchableOpacity
              accessibilityLabel="Use photo instead"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary-900 py-4"
              onPress={handlePhotoPress}
            >
              <Camera color={COLORS.white} size={20} />
              <Typography variant="button" className="text-white">
                Use photo instead
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Scan barcode again"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 py-4"
              onPress={handleClose}
            >
              <ScanBarcode color={COLORS.gray700} size={20} />
              <Typography variant="button" className="text-gray-700">
                Scan barcode again
              </Typography>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityLabel="Try again"
            accessibilityRole="button"
            activeOpacity={0.7}
            className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary-900 py-4"
            onPress={handleClose}
          >
            <Typography variant="button" className="text-white">
              {isSameProduct ? 'Scan another product' : 'Try again'}
            </Typography>
          </TouchableOpacity>
        )}
      </View>
    </ActionSheet>
  );
}
