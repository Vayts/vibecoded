import { View } from 'react-native';
import type { ReactNode } from 'react';
import { Button } from '../../../../shared/components/Button';
import { CustomLoader } from '../../../../shared/components/CustomLoader';
import { Typography } from '../../../../shared/components/Typography';
import { InitialProductAnalysisLoader } from './InitialProductAnalysisLoader';

export interface ProductResultDetailState {
  isLoading: boolean;
  isError: boolean;
  variant?: 'default' | 'initialAnalysis';
  errorMessage?: string;
  onRetry?: () => void;
}

interface DetailStateContentProps {
  detailState?: ProductResultDetailState;
  bottomAction?: ReactNode;
}

export function DetailStateContent({ detailState, bottomAction }: DetailStateContentProps) {
  if (!detailState?.isLoading && !detailState?.isError) {
    return null;
  }

  if (detailState.isLoading) {
    if (detailState.variant === 'initialAnalysis') {
      return <InitialProductAnalysisLoader />;
    }

    return (
      <View className="items-center justify-center px-6 py-12">
        <CustomLoader isReversed size="md" />
      </View>
    );
  }

  return (
    <View className="px-4 py-8">
      <Typography variant="sectionTitle" className="text-center">
        Something went wrong
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center">
        {detailState.errorMessage ?? 'Failed to load scan details'}
      </Typography>
      {detailState.onRetry ? (
        <View className="mt-4 items-center">
          <Button label="Retry" onPress={() => void detailState.onRetry?.()} />
        </View>
      ) : null}
      {bottomAction ? <View className="mt-6">{bottomAction}</View> : null}
    </View>
  );
}
