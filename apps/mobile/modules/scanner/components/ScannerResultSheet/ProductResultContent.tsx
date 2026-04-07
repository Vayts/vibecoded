import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  ProductPreview,
} from '@acme/shared';
import { View } from 'react-native';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './NotFoundContent';
import { ScrollView } from 'react-native-actions-sheet';
import { PersonalTabContent } from './PersonalTabContent';
import { ProductResultHeader } from './ProductResultHeader';
import { NutriScoreBlock } from './NutriScoreBlock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProductResultContentProps {
  result?: BarcodeLookupResponse;
  previewProduct?: ProductPreview;
  previewImageUri?: string | null;
  resolvedPersonalResult?: AnalysisJobResponse;
}

export function ProductResultContent({
  result,
  previewProduct,
  previewImageUri,
  resolvedPersonalResult,
}: ProductResultContentProps) {
  const insets = useSafeAreaInsets();
  const successResult = result && hasProductResult(result) ? result : undefined;
  const initialAnalysis = resolvedPersonalResult
    ? resolvedPersonalResult
    : successResult
      ? successResult.personalAnalysis
      : undefined;
  const personalQuery = usePersonalAnalysisQuery(initialAnalysis);

  const personalData = personalQuery.data ?? initialAnalysis;
  const personalError =
    Boolean(initialAnalysis?.analysisId) &&
    !personalData?.result &&
    (personalData?.status === 'failed' || personalQuery.isError);
  const personalRetry = () => {};

  if (result?.success === false) {
    return <NotFoundContent result={result} />;
  }

  const product = successResult?.product ?? previewProduct;
  const nutriScoreGrade =
    successResult?.product.scores.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    null;

  if (!product) {
    return null;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[660px]" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View>
        <View className="px-4">
          <ProductResultHeader
            product={product}
            previewImageUri={previewImageUri}
            productId={successResult?.productId}
            isFavourite={successResult?.isFavourite}
          />
          <NutriScoreBlock grade={nutriScoreGrade} />
        </View>
        <View>
          <PersonalTabContent
            personalResult={personalData}
            isError={personalError}
            onRetry={personalRetry}
            rawIngredients={successResult?.product.ingredients ?? []}
            rawIngredientsText={successResult?.product.ingredients_text ?? null}
          />
        </View>
      </View>
    </ScrollView>
  );
}
