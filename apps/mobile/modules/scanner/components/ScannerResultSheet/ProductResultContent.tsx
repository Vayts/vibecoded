import type { BarcodeLookupProduct, BarcodeLookupResponse } from '@acme/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './NotFoundContent';
import { ScrollView } from 'react-native-actions-sheet';
import { OverallTabContent } from './OverallTabContent';
import { PersonalTabContent } from './PersonalTabContent';
import { ProductResultHeader } from './ProductResultHeader';
import { NutriScoreBlock } from './NutriScoreBlock';
import { ScannerResultTabs, type ScannerResultTabKey } from './ScannerResultTabs';
import type { ScannerResultOrigin, ScannerResultPresentationMode } from '../../types/scanner';

interface ProductResultContentProps {
  result: BarcodeLookupResponse;
  previewImageUri?: string | null;
  presentationMode?: ScannerResultPresentationMode;
  origin?: ScannerResultOrigin;
}

export function ProductResultContent({
  result,
  previewImageUri,
  presentationMode = 'default',
  origin = 'barcode',
}: ProductResultContentProps) {
  const [selectedTab, setSelectedTab] = useState<ScannerResultTabKey>(
    presentationMode === 'personalOnly' ? 'personal' : 'overall',
  );
  const personalJobId = hasProductResult(result) ? result.personalAnalysis.jobId : undefined;
  const personalJobStatus = hasProductResult(result) ? result.personalAnalysis.status : undefined;
  const personalQuery = usePersonalAnalysisQuery(personalJobId, personalJobStatus);

  useEffect(() => {
    setSelectedTab(presentationMode === 'personalOnly' ? 'personal' : 'overall');
  }, [presentationMode]);

  if (!hasProductResult(result)) {
    return <NotFoundContent result={result} origin={origin} />;
  }

  const product: BarcodeLookupProduct = result.product;
  const personalResult = personalQuery.data;
  const isPersonalReady = personalResult?.status === 'completed' && Boolean(personalResult.result);
  const isPersonalLoading = !isPersonalReady && !personalQuery.isError;
  const isPersonalOnly = presentationMode === 'personalOnly';

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[560px]">
      <ProductResultHeader
        product={product}
        previewImageUri={previewImageUri}
        productId={result.productId}
        isFavourite={result.isFavourite}
      />

      {isPersonalOnly ? null : <NutriScoreBlock grade={product.scores.nutriscore_grade} />}

      {isPersonalOnly ? null : (
        <ScannerResultTabs
          selectedTab={selectedTab}
          onSelectTab={setSelectedTab}
          isPersonalLoading={isPersonalLoading}
          isPersonalReady={isPersonalReady}
          mode={presentationMode}
        />
      )}
      <View>
        {!isPersonalOnly && selectedTab === 'overall' ? (
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
