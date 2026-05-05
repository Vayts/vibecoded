import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileAnalysisTagsProps {
  goal: string | null;
  nutritionPositives: string[];
}

const normalizeTagLabel = (value: string): string =>
  value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function ProfileAnalysisTags({
  goal,
  nutritionPositives,
}: ProfileAnalysisTagsProps) {
  const tags = [goal ? normalizeTagLabel(goal) : null, ...nutritionPositives]
    .filter((tag): tag is string => Boolean(tag))
    .slice(0, 4);

  if (tags.length === 0) {
    return null;
  }

  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      {tags.map((tag) => (
        <View
          key={tag}
          className="rounded-full border px-3 py-2"
          style={{ backgroundColor: COLORS.gray50, borderColor: COLORS.gray200 }}
        >
          <Typography variant="bodySecondary" className="font-medium text-neutrals-700">
            {tag}
          </Typography>
        </View>
      ))}
    </View>
  );
}

