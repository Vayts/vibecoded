import React, { useRef } from 'react';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Text, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';
import ErrorMascot from '../../../assets/icons/mascot/error-mascot.svg';
import { SheetsEnum } from '../../../shared/types/sheets';
import type { BarcodeScannerErrorSheetPayload } from '../types/barcodeScanner';

export function BarcodeScannerErrorSheet() {
  const {
    title,
    message,
    actionLabel,
    onDismiss,
  } = useSheetPayload(SheetsEnum.BarcodeScannerErrorSheet) as BarcodeScannerErrorSheetPayload;
  const actionTakenRef = useRef(false);

  const handleClose = () => {
    actionTakenRef.current = true;
    void SheetManager.hide(SheetsEnum.BarcodeScannerErrorSheet);
  };

  const handleSheetClose = () => {
    onDismiss?.();
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
        <Text className="mb-2 mt-6 text-center text-[18px] font-bold">
          {title ?? 'Something went wrong'}
        </Text>
        <Text className="mb-6 text-center text-[14px] text-gray-500">{message}</Text>

        <TouchableOpacity
          accessibilityLabel={actionLabel ?? 'Try again'}
          accessibilityRole="button"
          activeOpacity={0.7}
          className="w-full items-center justify-center rounded-[16px] bg-primary-500 py-4"
          onPress={handleClose}
        >
          <Typography variant="button" className="text-white">
            {actionLabel ?? 'Try again'}
          </Typography>
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
}



