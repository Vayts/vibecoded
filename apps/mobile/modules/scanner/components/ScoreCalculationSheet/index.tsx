import { Calculator, X } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import ActionSheet, { ScrollView, SheetManager } from 'react-native-actions-sheet';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import CalculationMascot from '../../../../assets/icons/mascot/calculation-mascot.svg';
import { SCORE_CALCULATION } from '../../constants/score-calculation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScoreCalculationSheet() {
  const insets = useSafeAreaInsets();

  return (
    <ActionSheet
      gestureEnabled
      useBottomSafeAreaPadding={false}
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
    >
      <ScrollView className="px-6 pb-6 pt-4">
        <View className="flex-row gap-2 items-center">
          <Calculator size={16} color={COLORS.neutrals500} />
          <Text className="text-neutral-500 text-[12px]">Score calculation</Text>
        </View>

        <Text className="text-[20px] mt-2 text-neutral-900 font-bold">
          How food products are rated?
        </Text>

        <View className="pt-8 items-center">
          <CalculationMascot />
        </View>

        <Text className="text-neutral-600 mt-4">
          We evaluate food products using a personalized scoring system designed to reflect both
          nutritional quality and your individual needs.
        </Text>

        <Text className="mt-2 text-neutral-600">
          Each product starts with a base score and is then adjusted based on{' '}
          <Text className="font-semibold">multiple factors:</Text>
        </Text>

        <View className="mt-6">
          {SCORE_CALCULATION.map((item, index) => (
            <View className="mb-4" key={index}>
              <View className="flex flex-row items-center gap-2">
                <View className="h-[24px] w-[24px] bg-primary-500 rounded-full items-center justify-center">
                  <Text className="text-white">{index + 1}</Text>
                </View>
                <Text className="text-[16px] font-semibold text-neutral-900">{item.title}</Text>
              </View>

              <View className="mt-3">
                {item.text.map((subItem, index) => (
                  <Text className="text-neutral-600" key={`${item.title}-${index}-subitem`}>
                    {subItem}
                  </Text>
                ))}
              </View>

              {item.list ? (
                <View className="mt-3 gap-2">
                  {item.list.map((subItem, index) => (
                    <View className="flex items-center flex-row gap-1">
                      <View className="bg-primary-500 rounded-full h-2 w-2"/>
                      <Text className="text-neutral-600" key={`${item.title}-${index}-list`}>
                        {subItem}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={{height: insets.bottom + 32}}/>
      </ScrollView>
    </ActionSheet>
  );
}

