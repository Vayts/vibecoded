import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Typography } from '../../../shared/components/Typography';
import { SheetsEnum } from '../../../shared/types/sheets';
import type { PackagePhotoExtraction } from '../api/barcodeScannerMutations';

export interface PackagePhotoResultSheetPayload {
  extraction: PackagePhotoExtraction;
  onDismiss?: () => void;
}

const NUTRITION_LABELS: Record<keyof PackagePhotoExtraction['nutrition'], string> = {
  carbohydrates_100g: 'Carbs',
  energy_kcal_100g: 'Energy',
  fat_100g: 'Fat',
  fiber_100g: 'Fiber',
  proteins_100g: 'Protein',
  salt_100g: 'Salt',
  saturated_fat_100g: 'Sat. fat',
  sodium_100g: 'Sodium',
  sugars_100g: 'Sugars',
};

const formatIngredient = (ingredient: string, translation: string | null | undefined) => {
  const normalizedTranslation = translation?.trim();

  if (!normalizedTranslation || normalizedTranslation.toLowerCase() === ingredient.toLowerCase()) {
    return ingredient;
  }

  return `${ingredient} (${normalizedTranslation})`;
};

export function PackagePhotoResultSheet() {
  const payload = useSheetPayload(
    SheetsEnum.PackagePhotoResultSheet,
  ) as PackagePhotoResultSheetPayload;
  const { extraction } = payload;

  const handleClose = () => {
    void SheetManager.hide(SheetsEnum.PackagePhotoResultSheet);
  };

  const handleSheetClose = () => {
    payload.onDismiss?.();
  };

  return (
    <ActionSheet
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
      gestureEnabled
      useBottomSafeAreaPadding
      onClose={handleSheetClose}
    >
      <ScrollView className="max-h-[620px] px-6 pb-4 pt-6">
        <Typography variant="sectionTitle" className="text-center">
          Product details
        </Typography>

        <View className="mt-5 gap-4">
          <View>
            <Typography variant="fieldLabel" className="text-gray-500">
              Name
            </Typography>
            <Typography variant="body" className="mt-1 font-semibold">
              {extraction.productName ?? 'Unknown'}
            </Typography>
            {extraction.productNameEnglish ? (
              <Typography variant="bodySecondary" className="mt-1 text-gray-500">
                English: {extraction.productNameEnglish}
              </Typography>
            ) : null}
          </View>

          <View>
            <Typography variant="fieldLabel" className="text-gray-500">
              Brand
            </Typography>
            <Typography variant="body" className="mt-1">
              {extraction.productBrand ?? 'Unknown'}
            </Typography>
          </View>

          <View>
            <Typography variant="fieldLabel" className="text-gray-500">
              Product type
            </Typography>
            <Typography variant="body" className="mt-1">
              {extraction.productRole?.replace(/_/g, ' ') ?? 'Unknown'}
            </Typography>
          </View>

          <View>
            <Typography variant="fieldLabel" className="text-gray-500">
              Ingredients
            </Typography>
            {extraction.ingredients.length ? (
              <View className="mt-2 gap-2">
                {extraction.ingredients.map((ingredient, index) => (
                  <View key={`${ingredient}-${index}`} className="flex-row gap-2">
                    <Typography variant="bodySecondary" className="text-gray-500">
                      •
                    </Typography>
                    <Typography variant="bodySecondary" className="flex-1 leading-5 text-gray-700">
                      {formatIngredient(ingredient, extraction.ingredientsEnglish[index])}
                    </Typography>
                  </View>
                ))}
              </View>
            ) : (
              <Typography variant="bodySecondary" className="mt-1 leading-5 text-gray-700">
                No ingredients found
              </Typography>
            )}
          </View>

          <View>
            <Typography variant="fieldLabel" className="text-gray-500">
              Nutrition per 100g
            </Typography>
            <View className="mt-2 gap-1">
              {Object.entries(extraction.nutrition).map(([key, value]) => (
                <View key={key} className="flex-row justify-between">
                  <Typography variant="bodySecondary" className="text-gray-600">
                    {NUTRITION_LABELS[key as keyof PackagePhotoExtraction['nutrition']]}
                  </Typography>
                  <Typography variant="bodySecondary" className="text-gray-900">
                    {value === null ? '—' : value}
                  </Typography>
                </View>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel="Close product details"
          accessibilityRole="button"
          activeOpacity={0.7}
          className="mt-6 items-center justify-center rounded-[16px] bg-primary-500 py-4"
          onPress={handleClose}
        >
          <Typography variant="button" className="text-white">
            Done
          </Typography>
        </TouchableOpacity>
      </ScrollView>
    </ActionSheet>
  );
}



