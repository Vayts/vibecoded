import { Camera, ScanBarcode } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';
import { SheetsEnum } from '../../../shared/types/sheets';
import type { BarcodeScannerLookupSheetPayload } from '../types/barcodeScanner';
import { resolveStorageUri } from '../../../shared/lib/storage/resolveStorageUri';

export function BarcodeScannerLookupSheet() {
  const payload = useSheetPayload(
    SheetsEnum.BarcodeScannerLookupSheet,
  ) as BarcodeScannerLookupSheetPayload;
  const actionTakenRef = useRef<'analyze' | 'dismiss' | 'photo' | null>(null);
  const isFound = payload.variant === 'found';
  const imageUri = resolveStorageUri(payload.imageUrl) ?? null;

  const handleClose = () => {
    actionTakenRef.current = 'dismiss';
    void SheetManager.hide(SheetsEnum.BarcodeScannerLookupSheet);
  };

  const handlePhotoPress = () => {
    actionTakenRef.current = 'photo';
    void SheetManager.hide(SheetsEnum.BarcodeScannerLookupSheet);
  };

  const handleAnalyzePress = () => {
    actionTakenRef.current = 'analyze';
    void SheetManager.hide(SheetsEnum.BarcodeScannerLookupSheet);
  };

  const handleSheetClose = () => {
    if (actionTakenRef.current === 'photo') {
      payload.onPhotoPress?.();
    } else if (actionTakenRef.current === 'analyze') {
      payload.onAnalyzePress?.();
    } else {
      payload.onDismiss?.();
    }

    actionTakenRef.current = null;
  };

  return (
    <ActionSheet
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
      gestureEnabled
      useBottomSafeAreaPadding
      onClose={handleSheetClose}
    >
      <View className="px-6 pb-4 pt-6">
        {isFound ? (
          <View className="items-center">
            <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] bg-gray-100">
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="items-center px-4">
                  <ScanBarcode color={COLORS.gray500} size={28} />
                </View>
              )}
            </View>

            <Text className="mt-5 text-center text-[18px] font-bold">
              {payload.productName?.trim() || 'Product found'}
            </Text>
            <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">
              {payload.brandName?.trim() || 'Brand unavailable'}
            </Typography>

            <TouchableOpacity
              accessibilityLabel="Analyze product"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="mt-6 w-full items-center justify-center rounded-[16px] bg-primary-500 py-4"
              onPress={handleAnalyzePress}
            >
              <Typography variant="button" className="text-white">
                Analyze
              </Typography>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center">
            <View className="h-28 w-28 items-center justify-center rounded-[24px] bg-gray-100">
              <ScanBarcode color={COLORS.gray500} size={36} />
            </View>

            <Text className="mt-5 text-center text-[18px] font-bold">Product not found</Text>
            <Text className="mt-2 text-center text-[14px] leading-6 text-gray-500">
              Scan the front label, then ingredients and nutrition facts. You can add one extra side
              if details are split across panels.
            </Text>

            <View className="mt-6 w-full gap-3">
              <TouchableOpacity
                accessibilityLabel="Scan product sides"
                accessibilityRole="button"
                activeOpacity={0.7}
                className="w-full flex-row items-center justify-center gap-2 rounded-[16px] bg-primary-500 py-4"
                onPress={handlePhotoPress}
              >
                <Camera color={COLORS.white} size={20} />
                <Typography variant="button" className="text-white">
                  Scan product sides
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
          </View>
        )}
      </View>
    </ActionSheet>
  );
}
