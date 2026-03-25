import type { BarcodeLookupProduct, BarcodeLookupResponse } from '@acme/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './ProductResultSections';
import { ScrollView } from 'react-native-actions-sheet';
import { OverallTabContent } from './OverallTabContent';
import { PersonalTabContent } from './PersonalTabContent';
import { ProductResultHeader } from './ProductResultHeader';
import { NutriScoreBlock } from './NutriScoreBlock';
import { ScannerResultTabs, type ScannerResultTabKey } from './ScannerResultTabs';

interface ProductResultContentProps {
  result: BarcodeLookupResponse;
}

export function ProductResultContent({ result }: ProductResultContentProps) {
  const [selectedTab, setSelectedTab] = useState<ScannerResultTabKey>('overall');
  const personalJobId = hasProductResult(result) ? result.personalAnalysis.jobId : undefined;
  const personalJobStatus = hasProductResult(result) ? result.personalAnalysis.status : undefined;
  const personalQuery = usePersonalAnalysisQuery(personalJobId, personalJobStatus);

  if (!hasProductResult(result)) {
    return <NotFoundContent result={result} />;
  }

  const product: BarcodeLookupProduct = result.product;
  const personalResult = personalQuery.data;
  const isPersonalReady = personalResult?.status === 'completed' && Boolean(personalResult.result);
  const isPersonalLoading = !isPersonalReady && !personalQuery.isError;

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[560px]">
      <ProductResultHeader product={product} />

      <NutriScoreBlock grade={product.scores.nutriscore_grade} />

      <ScannerResultTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        isPersonalLoading={isPersonalLoading}
        isPersonalReady={isPersonalReady}
      />
      <View>
        {selectedTab === 'overall' ? (
          <OverallTabContent evaluation={result.evaluation} />
        ) : (
          <PersonalTabContent
            personalResult={personalResult}
            isError={personalQuery.isError}
            onRetry={() => void personalQuery.refetch()}
          />
        )}
      </View>
    </ScrollView>
  );
}
