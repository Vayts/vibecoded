import { ChevronRight } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../../shared/components/Typography';
import { COLORS } from '../../../../../shared/constants/colors';

interface HealthProfileSectionProps {
  mainGoalSummary: string;
  restrictionsSummary: string;
  allergiesSummary: string;
  preferencesSummary: string;
  onPressMainGoal: () => void;
  onPressRestrictions: () => void;
  onPressAllergies: () => void;
  onPressPreferences: () => void;
}

interface HealthProfileRowProps {
  label: string;
  summary: string;
  onPress: () => void;
}

function HealthProfileRow({ label, summary, onPress }: HealthProfileRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="min-h-[72px] flex-row items-center border-b border-gray-200 px-4 py-4 last:border-b-0"
      onPress={onPress}
    >
      <View className="flex-1 pr-4">
        <Typography variant="bodySecondary" className="text-neutrals-500">
          {label}
        </Typography>
        <Typography variant="body" className="mt-1 font-semibold text-neutrals-900">
          {summary}
        </Typography>
      </View>
      <ChevronRight color={COLORS.gray400} size={18} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export function HealthProfileSection({
  mainGoalSummary,
  restrictionsSummary,
  allergiesSummary,
  preferencesSummary,
  onPressMainGoal,
  onPressRestrictions,
  onPressAllergies,
  onPressPreferences,
}: HealthProfileSectionProps) {
  return (
    <View className="mt-8">
      <Typography variant="sectionTitle" className="text-neutrals-900">
        Health profile
      </Typography>

      <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <HealthProfileRow
          label="Main goal"
          summary={mainGoalSummary}
          onPress={onPressMainGoal}
        />
        <HealthProfileRow
          label="Restrictions"
          summary={restrictionsSummary}
          onPress={onPressRestrictions}
        />
        <HealthProfileRow
          label="Allergies"
          summary={allergiesSummary}
          onPress={onPressAllergies}
        />
        <HealthProfileRow
          label="Preferences"
          summary={preferencesSummary}
          onPress={onPressPreferences}
        />
      </View>
    </View>
  );
}