import { useRef } from 'react';
import { Image, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useCompareStore } from '../../stores/compareStore';
import { useScanBarcodeMutation } from '../../hooks/useScannerMutations';

export function ProductDecisionSheet() {
  const payload = useSheetPayload(SheetsEnum.ProductDecisionSheet);
  // Track whether the sheet is being hidden by an action (Analyze/Compare)
  // vs. user swipe-to-dismiss. Only swipe-dismiss should call onDismiss here.
  const actionTakenRef = useRef(false);
  const product = payload?.product;
  const onDismiss = payload?.onDismiss as (() => void) | undefined;
  const startCompare = useCompareStore((s) => s.startCompare);
  const barcodeMutation = useScanBarcodeMutation();

  if (!product) return null;

  const handleAnalyze = async () => {
    // Mark that an action is taking ownership of the scanner pause.
    // The scanner will be resumed when the ScannerResultSheet closes.
    actionTakenRef.current = true;
    await SheetManager.hide(SheetsEnum.ProductDecisionSheet);
    try {
      const result = await barcodeMutation.mutateAsync({ barcode: product.barcode });
      await SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: { result },
        onClose: onDismiss,
      });
    } catch {
      // Analysis failed — resume scanner so user can try again
      onDismiss?.();
    }
  };

  const handleCompare = async () => {
    actionTakenRef.current = true;
    startCompare(product);
    await SheetManager.hide(SheetsEnum.ProductDecisionSheet);
    // Resume scanner so user can scan the second product
    onDismiss?.();
  };

  const handleSheetClose = () => {
    // Only resume scanner if user swiped-to-dismiss (no action was taken)
    if (!actionTakenRef.current) {
      onDismiss?.();
    }
    actionTakenRef.current = false;
  };

  return (
    <ActionSheet gestureEnabled onClose={handleSheetClose}>
      <View className="items-center px-6 pb-6 pt-2">
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            className="mb-4 h-32 w-32 rounded-2xl bg-gray-100"
            resizeMode="contain"
            accessibilityLabel={product.product_name ?? 'Product image'}
          />
        ) : (
          <View className="mb-4 h-32 w-32 items-center justify-center rounded-2xl bg-gray-100">
            <Typography variant="hero" className="text-gray-300">
              📦
            </Typography>
          </View>
        )}

        <Typography variant="sectionTitle" className="text-center" numberOfLines={2}>
          {product.product_name ?? 'Unknown product'}
        </Typography>

        {product.brands ? (
          <Typography variant="bodySecondary" className="mt-1 text-center">
            {product.brands}
          </Typography>
        ) : null}

        <View className="mt-6 w-full gap-3">
          <Button
            fullWidth
            label={barcodeMutation.isPending ? 'Analyzing…' : 'Analyze'}
            loading={barcodeMutation.isPending}
            onPress={() => void handleAnalyze()}
            accessibilityLabel="Analyze this product"
            accessibilityRole="button"
          />
          <Button
            fullWidth
            variant="secondary"
            label="Compare with another"
            disabled={barcodeMutation.isPending}
            onPress={() => void handleCompare()}
            accessibilityLabel="Compare this product with another"
            accessibilityRole="button"
          />
        </View>
      </View>
    </ActionSheet>
  );
}
