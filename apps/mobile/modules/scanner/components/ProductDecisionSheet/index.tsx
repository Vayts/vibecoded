import { useRef } from 'react';
import { Image, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useCompareStore } from '../../stores/compareStore';
import { useScanBarcodeMutation, usePhotoScanMutation } from '../../hooks/useScannerMutations';

export function ProductDecisionSheet() {
  const payload = useSheetPayload(SheetsEnum.ProductDecisionSheet);
  // Track whether the sheet is being hidden by an action (Analyze/Compare)
  // vs. user swipe-to-dismiss. Only swipe-dismiss should call onDismiss here.
  const actionTakenRef = useRef(false);
  const product = payload?.product;
  const imageBase64 = payload?.imageBase64 as string | undefined;
  const onDismiss = payload?.onDismiss as (() => void) | undefined;
  const onAnalyzeStart = payload?.onAnalyzeStart as (() => void) | undefined;
  const startCompare = useCompareStore((s) => s.startCompare);
  const barcodeMutation = useScanBarcodeMutation();
  const photoMutation = usePhotoScanMutation();

  if (!product) return null;

  const isPhoto = Boolean(imageBase64);
  const resolvedImageUrl = isPhoto ? product.image_url : resolveStorageUri(product.image_url);
  const isPending = barcodeMutation.isPending || photoMutation.isPending;

  const handleAnalyze = async () => {
    actionTakenRef.current = true;
    onAnalyzeStart?.();
    await SheetManager.hide(SheetsEnum.ProductDecisionSheet);
    try {
      if (imageBase64) {
        // Photo flow: run full identification + analysis
        const result = await photoMutation.mutateAsync({ imageBase64 });
        await SheetManager.show(SheetsEnum.ScannerResultSheet, {
          payload: { result },
          onClose: onDismiss,
        });
      } else {
        // Barcode flow: trigger analysis by barcode
        const result = await barcodeMutation.mutateAsync({ barcode: product.barcode });
        await SheetManager.show(SheetsEnum.ScannerResultSheet, {
          payload: { result },
          onClose: onDismiss,
        });
      }
    } catch {
      onDismiss?.();
    }
  };

  const handleCompare = async () => {
    actionTakenRef.current = true;
    // Store product + imageBase64 (if photo) for deferred resolution when second product is scanned
    startCompare(product, imageBase64);
    await SheetManager.hide(SheetsEnum.ProductDecisionSheet);
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
        {resolvedImageUrl ? (
          <Image
            source={{ uri: resolvedImageUrl }}
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
            label={isPending ? 'Processing…' : 'Analyze'}
            loading={isPending}
            onPress={() => void handleAnalyze()}
            accessibilityLabel="Analyze this product"
            accessibilityRole="button"
          />
          <Button
            fullWidth
            variant="secondary"
            label="Compare with another"
            disabled={isPending}
            onPress={() => void handleCompare()}
            accessibilityLabel="Compare this product with another"
            accessibilityRole="button"
          />
        </View>
      </View>
    </ActionSheet>
  );
}
