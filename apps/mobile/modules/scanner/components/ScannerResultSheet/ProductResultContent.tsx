import type { BarcodeLookupProduct, BarcodeLookupResponse } from '@acme/shared';
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
}

export function ProductResultContent({ result }: ProductResultContentProps) {
  const personalJobId = hasProductResult(result) ? result.personalAnalysis.jobId : undefined;
  const personalJobStatus = hasProductResult(result) ? result.personalAnalysis.status : undefined;
  const personalQuery = usePersonalAnalysisQuery(personalJobId, personalJobStatus);

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
          personalResult={personalQuery.data}
          isError={personalQuery.isError}
          onRetry={() => void personalQuery.refetch()}
        />
      </View>
    </ScrollView>
  );
}
