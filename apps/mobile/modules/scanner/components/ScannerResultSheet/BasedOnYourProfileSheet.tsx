import React from 'react';
import ActionSheet, { useSheetPayload } from 'react-native-actions-sheet';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BasedOnYourProfileSheet = () => {
  const { title } = useSheetPayload(SheetsEnum.BasedOnYourProfileSheet);
  const insets = useSafeAreaInsets();

  return (
    <ActionSheet gestureEnabled>
      <View className="px-4 pt-6" style={{paddingBottom: insets.bottom}}>
        <Typography variant="sectionTitle">{title}</Typography>
        <Typography variant="body" className="mt-2">Based on your profile</Typography>
      </View>
    </ActionSheet>
  );
};

export default BasedOnYourProfileSheet;
