import type {
  BarcodeLookupProduct,
  BarcodeLookupResponse,
  MultiProfilePersonalAnalysisJobResponse,
} from '@acme/shared';
import { View } from 'react-native';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './NotFoundContent';
import { ScrollView } from 'react-native-actions-sheet';
import { PersonalTabContent } from './PersonalTabContent';
import { ProductResultHeader } from './ProductResultHeader';
import { NutriScoreBlock } from './NutriScoreBlock';

interface ProductResultContentProps {
  result: BarcodeLookupResponse;
  resolvedPersonalResult?: MultiProfilePersonalAnalysisJobResponse;
}

export function ProductResultContent({ result, resolvedPersonalResult }: ProductResultContentProps) {
  const personalJobId =
    !resolvedPersonalResult && hasProductResult(result)
      ? result.personalAnalysis.jobId
      : undefined;
  const personalJobStatus =
    !resolvedPersonalResult && hasProductResult(result)
      ? result.personalAnalysis.status
      : undefined;
  const personalQuery = usePersonalAnalysisQuery(personalJobId, personalJobStatus);

  const personalData = resolvedPersonalResult ?? personalQuery.data;
  const personalError = resolvedPersonalResult ? false : personalQuery.isError;
  const personalRetry = resolvedPersonalResult ? () => {} : () => void personalQuery.refetch();

  if (!hasProductResult(result)) {
    return <NotFoundContent result={result} />;
  }

  const product: BarcodeLookupProduct = result.product;

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[560px]">
      <ProductResultHeader
        product={product}
        productId={result.productId}
        isFavourite={result.isFavourite}
      />

      <NutriScoreBlock grade={product.scores.nutriscore_grade} />

      <View>
        <PersonalTabContent
          personalResult={personalData}
          isError={personalError}
          onRetry={personalRetry}
        />
      </View>
    </ScrollView>
  );
}
