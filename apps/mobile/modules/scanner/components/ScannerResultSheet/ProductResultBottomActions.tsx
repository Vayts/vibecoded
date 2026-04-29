import { ArrowLeftRight, Calculator } from 'lucide-react-native';
import { View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';

import { FavouriteButton } from './FavouriteButton';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ResultSheetActionButton } from './ResultSheetActionButton';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ScanDeleteAction } from './ScanDeleteAction';

interface ProductResultBottomActionsProps {
  scanId?: string;
  productId?: string;
  isFavourite?: boolean;
  isCompareDisabled?: boolean;
  onComparePress: () => void;
}

export function ProductResultBottomActions({
  scanId,
  productId,
  isFavourite = false,
  isCompareDisabled = false,
  onComparePress,
}: ProductResultBottomActionsProps) {
  return (
    <View className="pt-3 gap-4">
      <Typography variant="sectionTitle" className="text-gray-900 font-bold">
        Options
      </Typography>
      {productId ? <FavouriteButton productId={productId} isFavourite={isFavourite} /> : null}
      <ResultSheetActionButton
        label="Compare with another product"
        icon={<ArrowLeftRight color={COLORS.neutrals900} size={18} strokeWidth={1.9} />}
        disabled={isCompareDisabled}
        onPress={onComparePress}
      />
      <ResultSheetActionButton
        label="Score calculation"
        icon={<Calculator color={COLORS.neutrals900} size={18} strokeWidth={1.9} />}
        onPress={() => {
          void SheetManager.show(SheetsEnum.ScoreCalculationSheet);
        }}
      />
      <ScanDeleteAction scanId={scanId} />
    </View>
  );
}
