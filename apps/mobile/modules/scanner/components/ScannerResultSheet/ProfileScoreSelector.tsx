import { TouchableOpacity, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import type { ProfileScoreSelectorSheetProfile } from '../../types/scanner';
import { ChevronDown } from 'lucide-react-native';

const GOOD_SCORE_MIN = 70;
const NEUTRAL_SCORE_MIN = 40;

export type ProfileScoreSelectorItem = ProfileScoreSelectorSheetProfile;

interface ProfileScoreSelectorProps {
  profiles: ProfileScoreSelectorItem[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
  className?: string;
}

type SelectorTone = 'good' | 'neutral' | 'bad';

export const PROFILE_SCORE_TONES = {
  good: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.profileChipGoodBorder,
    textColor: COLORS.primary900,
  },
  neutral: {
    backgroundColor: COLORS.neutrals100,
    borderColor: COLORS.profileChipNeutralBorder,
    textColor: COLORS.neutrals700,
  },
  bad: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.profileChipBadBorder,
    textColor: COLORS.danger,
  },
} as const;

export const getProfileScoreTone = (score?: number): SelectorTone => {
  if (score == null) {
    return 'neutral';
  }

  if (score >= GOOD_SCORE_MIN) {
    return 'good';
  }

  if (score >= NEUTRAL_SCORE_MIN) {
    return 'neutral';
  }

  return 'bad';
};

export function ProfileScoreSelector({
  profiles,
  selectedProfileId,
  onSelect,
  className,
}: ProfileScoreSelectorProps) {
  if (profiles.length <= 1) {
    return null;
  }

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

  const handlePress = () => {
    void SheetManager.show(SheetsEnum.ProfileScoreSelectorSheet, {
      payload: {
        profiles,
        selectedProfileId: selectedProfile.id,
        onSelect,
      },
    });
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      className={`min-h-[32px] self-start flex-row items-center rounded-[8px] w-fit border px-2 py-1 ${className ?? ''}`.trim()}
      style={{ borderColor: COLORS.neutrals200 }}
      onPress={handlePress}
    >
      <UserAvatar
        imageUrl={selectedProfile.imageUrl}
        fallbackImageUrl={selectedProfile.fallbackImageUrl}
        name={selectedProfile.name}
        size="xss"
      />

      <View className="ml-1 flex-row items-center gap-2 flex-shrink">
        <Typography numberOfLines={1} className="text-neutrals-900 text-[14px] line-clamp-1 flex-shrink">
          {selectedProfile.name}
        </Typography>

        <ChevronDown strokeWidth={1} size={18}/>
      </View>
    </TouchableOpacity>
  );
}
