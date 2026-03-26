import type { ScanDetailResponse } from '@acme/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ProductResultHeader } from '../../../scanner/components/ScannerResultSheet/ProductResultHeader';
import { NutriScoreBlock } from '../../../scanner/components/ScannerResultSheet/NutriScoreBlock';
import {
  ScannerResultTabs,
  type ScannerResultTabKey,
} from '../../../scanner/components/ScannerResultSheet/ScannerResultTabs';
import { OverallTabContent } from '../../../scanner/components/ScannerResultSheet/OverallTabContent';
import { Typography } from '../../../../shared/components/Typography';
import { ScoreSummary } from '../../../scanner/components/ScannerResultSheet/ScoreSummary';
import { EvaluationSection } from '../../../scanner/components/ScannerResultSheet/EvaluationSection';
import { mapFitLabelToToneKey } from '../../../scanner/components/ScannerResultSheet/evaluationHelpers';

interface ScanDetailContentProps {
  scan: ScanDetailResponse;
}

export function ScanDetailContent({ scan }: ScanDetailContentProps) {
  const [selectedTab, setSelectedTab] = useState<ScannerResultTabKey>('overall');

  if (!scan.product) {
    return (
      <View className="items-center justify-center py-12">
        <Typography variant="sectionTitle">Product not found</Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center">
          The product from this scan is no longer available.
        </Typography>
      </View>
    );
  }

  const hasPersonalResult =
    scan.personalAnalysisStatus === 'completed' && scan.personalResult != null;
  const isPersonalPending = scan.personalAnalysisStatus === 'pending';
  const isPersonalFailed = scan.personalAnalysisStatus === 'failed';

  return (
    <View>
      <ProductResultHeader product={scan.product} />

      <NutriScoreBlock grade={scan.product.scores.nutriscore_grade} />

      <ScannerResultTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        isPersonalLoading={isPersonalPending}
        isPersonalReady={hasPersonalResult}
      />

      <View>
        {selectedTab === 'overall' && scan.evaluation ? (
          <OverallTabContent evaluation={scan.evaluation} />
        ) : selectedTab === 'overall' && !scan.evaluation ? (
          <View className="mt-4 items-center py-8">
            <Typography variant="bodySecondary">
              No overall evaluation available for this scan.
            </Typography>
          </View>
        ) : selectedTab === 'personal' ? (
          <PersonalResultFromScan
            hasResult={hasPersonalResult}
            isPending={isPersonalPending}
            isFailed={isPersonalFailed}
            personalResult={scan.personalResult}
          />
        ) : null}
      </View>
    </View>
  );
}

interface PersonalResultFromScanProps {
  hasResult: boolean;
  isPending: boolean;
  isFailed: boolean;
  personalResult: ScanDetailResponse['personalResult'];
}

function PersonalResultFromScan({
  hasResult,
  isPending,
  isFailed,
  personalResult,
}: PersonalResultFromScanProps) {
  if (hasResult && personalResult) {
    return (
      <View>
        <ScoreSummary
          title="Fit score"
          score={personalResult.fitScore}
          label={personalResult.fitLabel}
          toneKey={mapFitLabelToToneKey(personalResult.fitLabel)}
        />
        {personalResult.summary ? (
          <View className="mt-4 rounded-xl border border-gray-100 bg-white px-4 py-4">
            <Typography variant="bodySecondary" className="leading-6 text-gray-700">
              {personalResult.summary}
            </Typography>
          </View>
        ) : null}
        <EvaluationSection
          title="Positives"
          items={personalResult.positives}
          rightLabel="For you"
        />
        <EvaluationSection
          title="Negatives"
          items={personalResult.negatives}
          rightLabel="For you"
        />
      </View>
    );
  }

  if (isPending) {
    return (
      <View className="mt-4 items-center py-8">
        <Typography variant="bodySecondary">Personal analysis is still being processed…</Typography>
      </View>
    );
  }

  if (isFailed) {
    return (
      <View className="mt-4 items-center py-8">
        <Typography variant="bodySecondary">Personal analysis failed for this scan.</Typography>
      </View>
    );
  }

  return (
    <View className="mt-4 items-center py-8">
      <Typography variant="bodySecondary">No personal analysis available.</Typography>
    </View>
  );
}
