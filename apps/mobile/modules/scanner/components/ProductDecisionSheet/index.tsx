import { useRef } from 'react';
import { Image, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScannerApiError } from '../../api/scannerMutations';
import type { ProductDecisionSheetPayload } from '../../types/scanner';
import { useCompareStore } from '../../stores/compareStore';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { useScanBarcodeMutation, usePhotoScanMutation } from '../../hooks/useScannerMutations';

export function ProductDecisionSheet() {
  const payload = useSheetPayload(SheetsEnum.ProductDecisionSheet) as ProductDecisionSheetPayload | null;
  const actionTakenRef = useRef(false);
  const product = payload?.product;
  const photoUri = payload?.photoUri;
  const photoOcr = payload?.photoOcr;
  const onDismiss = payload?.onDismiss;
  const startCompare = useCompareStore((s) => s.startCompare);
  const startResultSession = useScannerResultSheetStore((s) => s.startSession);
  const hydrateResultSession = useScannerResultSheetStore((s) => s.hydrateSession);
  const resetResultSession = useScannerResultSheetStore((s) => s.reset);
  const barcodeMutation = useScanBarcodeMutation();
  const photoMutation = usePhotoScanMutation();

  if (!product) return null;

  const isPhoto = Boolean(photoUri);
  const resolvedImageUrl = isPhoto ? product.image_url : resolveStorageUri(product.image_url);
  const isPending = barcodeMutation.isPending || photoMutation.isPending;

  const handleAnalyze = async () => {
    actionTakenRef.current = true;
    const sessionId = startResultSession();
    await SheetManager.hide(SheetsEnum.ProductDecisionSheet);
    void SheetManager.show(SheetsEnum.ScannerResultSheet, {
      payload: {
        previewProduct: product,
        previewImageUri: resolvedImageUrl,
      },
      onClose: onDismiss,
    });

    try {
      if (photoUri) {
        // Photo flow: run full identification + analysis
        const result = await photoMutation.mutateAsync({ photoUri, ocr: photoOcr });
        hydrateResultSession(sessionId, result);
      } else {
        // Barcode flow: trigger analysis by barcode
        const result = await barcodeMutation.mutateAsync({ barcode: product.barcode });
        hydrateResultSession(sessionId, result);
      }
    } catch (error) {
      resetResultSession();
      await SheetManager.hide(SheetsEnum.ScannerResultSheet);

      const errorMessage = error instanceof Error ? error.message : 'Unable to analyze product';
      const errorCode = error instanceof ScannerApiError ? error.code : undefined;
      const isPhotoNotFound = Boolean(photoUri) && errorCode === 'PRODUCT_NOT_FOUND';

      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant: errorCode === 'NOT_FOOD' ? 'not-food' : isPhotoNotFound ? 'not-found' : 'generic',
          title:
            errorCode === 'NOT_FOOD'
              ? 'This is not a food product'
              : isPhotoNotFound
                ? 'Product not found'
                : undefined,
          message:
            errorCode === 'NOT_FOOD'
              ? 'The photo does not appear to show a food or drink product. Please scan a food item instead.'
              : isPhotoNotFound
                ? 'We couldn\'t identify a product from this photo. Try taking another photo with the full package visible.'
                : errorMessage,
          onDismiss,
        },
      });
    }
  };

  const handleCompare = async () => {
    actionTakenRef.current = true;
    // Store product + photo URI (if photo) for deferred resolution when second product is scanned
    startCompare(product, photoUri, photoOcr);
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
