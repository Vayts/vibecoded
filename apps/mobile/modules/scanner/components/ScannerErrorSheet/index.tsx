import { Camera, ScanBarcode } from 'lucide-react-native';
import { useRef } from 'react';
import ActionSheet, { useSheetPayload, SheetManager } from 'react-native-actions-sheet';
import { Text, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import ErrorMascot from '../../../../assets/icons/mascot/error-mascot.svg';

export interface ScannerErrorSheetPayload {
  variant?:
    | 'generic'
    | 'not-found'
    | 'not-food'
    | 'same-product'
    | 'insufficient-data'
    | 'packaging-required';
  title?: string;
  message: string;
  onDismiss?: () => void;
  onPhotoPress?: () => void;
}

export function ScannerErrorSheet() {
  const {
    variant = 'generic',
    title,
    message,
    onDismiss,
    onPhotoPress,
  } = useSheetPayload(SheetsEnum.ScannerErrorSheet);
  const isNotFound = variant === 'not-found';
  const isNotFood = variant === 'not-food';
  const isSameProduct = variant === 'same-product';
  const isInsufficientData = variant === 'insufficient-data';
  const isPackagingRequired = variant === 'packaging-required';
  const showsPhotoActions = (isNotFound || isInsufficientData) && Boolean(onPhotoPress);
  const actionTakenRef = useRef(false);

  const resolvedTitle = isNotFound
    ? (title ?? 'Product not found')
    : isNotFood
      ? 'This is not a food product'
      : isPackagingRequired
        ? (title ?? 'We need a packaged product')
      : isSameProduct
        ? (title ?? 'This is the same product')
        : isInsufficientData
          ? (title ?? 'Not enough information about product')
          : (title ?? 'Something went wrong');
  const resolvedMessage =
    isNotFound && showsPhotoActions
      ? 'We couldn’t find this product by barcode. Try scanning the barcode again or take a photo of the product instead.'
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
    <ActionSheet
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
      gestureEnabled
      useBottomSafeAreaPadding
      onClose={handleSheetClose}
    >
      <View className="items-center px-6 pb-4 pt-6">
        <ErrorMascot />

        <Text className="text-[18px] font-bold mb-2 mt-6 text-center">{resolvedTitle}</Text>

        <Text className="text-[14px] mb-6 text-center text-gray-500">{resolvedMessage}</Text>

        {showsPhotoActions ? (
          <View className="w-full gap-3">
            <TouchableOpacity
              accessibilityLabel="Use photo instead"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="w-full flex-row items-center justify-center gap-2 rounded-[16px] bg-primary-500 py-4"
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
              className="w-full flex-row items-center justify-center gap-2 rounded-[16px] border border-gray-300 py-4"
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
            accessibilityLabel={
              isSameProduct
                ? 'Scan another product'
                : isPackagingRequired
                  ? 'Take another photo'
                  : 'Try again'
            }
            accessibilityRole="button"
            activeOpacity={0.7}
            className="w-full flex-row rounded-[16px] items-center justify-center gap-2 bg-primary-500 py-4"
            onPress={handleClose}
          >
            <Typography variant="button" className="text-white">
              {isSameProduct
                ? 'Scan another product'
                : isPackagingRequired
                  ? 'Take another photo'
                  : 'Try again'}
            </Typography>
          </TouchableOpacity>
        )}
      </View>
    </ActionSheet>
  );
}
