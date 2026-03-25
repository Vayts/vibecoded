import { ActivityIndicator, Pressable, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

const PERSONAL_STATUS_SLOT_SIZE = 16;

export type ScannerResultTabKey = 'overall' | 'personal';

interface ScannerResultTabsProps {
  selectedTab: ScannerResultTabKey;
  onSelectTab: (tab: ScannerResultTabKey) => void;
  isPersonalLoading?: boolean;
  isPersonalReady?: boolean;
}

const TABS: Array<{ key: ScannerResultTabKey; label: string }> = [
  { key: 'overall', label: 'Overall' },
  { key: 'personal', label: 'Personal' },
];

export function ScannerResultTabs({
  selectedTab,
  onSelectTab,
  isPersonalLoading = false,
  isPersonalReady = false,
}: ScannerResultTabsProps) {
  return (
    <View className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-1">
      <View className="flex-row gap-1">
        {TABS.map((tab) => {
          const isSelected = tab.key === selectedTab;
          const isPersonalTab = tab.key === 'personal';
          const showPersonalLoader = isPersonalTab && isPersonalLoading;
          const showPersonalReady = isPersonalTab && isPersonalReady;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={`${tab.label} tab`}
              className="flex-1 rounded-lg px-4 py-3"
              onPress={() => {
                onSelectTab(tab.key);
              }}
              style={{ backgroundColor: isSelected ? COLORS.white : COLORS.transparent }}
            >
              <View className="flex-row items-center justify-center">
                {isPersonalTab ? (
                  <View
                    aria-hidden
                    style={{ width: PERSONAL_STATUS_SLOT_SIZE, height: PERSONAL_STATUS_SLOT_SIZE }}
                  />
                ) : null}
                <Typography
                  variant="buttonSmall"
                  className="text-center"
                  style={{ color: isSelected ? COLORS.gray900 : COLORS.gray500 }}
                >
                  {tab.label}
                </Typography>
                {isPersonalTab ? (
                  <View
                    className="ml-2 items-center justify-center"
                    style={{ width: PERSONAL_STATUS_SLOT_SIZE, height: PERSONAL_STATUS_SLOT_SIZE }}
                  >
                    {showPersonalLoader ? (
                      <ActivityIndicator
                        accessibilityLabel="Personal analysis loading"
                        color={COLORS.gray500}
                        size="small"
                      />
                    ) : null}
                    {showPersonalReady ? (
                      <View
                        accessibilityLabel="Personal analysis ready"
                        className="h-2.5 w-2.5 rounded-full bg-green-500"
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
