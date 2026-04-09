import { View, Text } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface NutriScoreBlockProps {
  grade: string | null | undefined;
}

type NutriScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

interface NutriScoreSegment {
  grade: NutriScoreGrade;
  backgroundColor: string;
  activeBackgroundColor: string;
  activeBorderColor: string;
  description: string;
}

export const NUTRI_SCORE_BLOCK_ESTIMATED_HEIGHT = 120;

const BAR_HEIGHT = 26;
const BAR_RADIUS = 12;
const ACTIVE_SEGMENT_BORDER_WIDTH = 3;
const POINTER_WIDTH = 8;
const POINTER_HEIGHT = 8;

const SEGMENTS: NutriScoreSegment[] = [
  {
    grade: 'a',
    backgroundColor: COLORS.nutriScoreA,
    activeBackgroundColor: COLORS.nutriScoreA,
    activeBorderColor: COLORS.nutriScoreAActive,
    description: 'High quality',
  },
  {
    grade: 'b',
    backgroundColor: COLORS.nutriScoreB,
    activeBackgroundColor: COLORS.nutriScoreB,
    activeBorderColor: COLORS.nutriScoreBActive,
    description: 'Good quality',
  },
  {
    grade: 'c',
    backgroundColor: COLORS.nutriScoreC,
    activeBackgroundColor: COLORS.nutriScoreC,
    activeBorderColor: COLORS.nutriScoreCActive,
    description: 'Moderate quality',
  },
  {
    grade: 'd',
    backgroundColor: COLORS.nutriScoreD,
    activeBackgroundColor: COLORS.nutriScoreD,
    activeBorderColor: COLORS.nutriScoreDActive,
    description: 'Low quality',
  },
  {
    grade: 'e',
    backgroundColor: COLORS.nutriScoreE,
    activeBackgroundColor: COLORS.nutriScoreE,
    activeBorderColor: COLORS.nutriScoreEActive,
    description: 'Poor quality',
  },
];

export const isNutriScoreGrade = (value: string | null | undefined): value is NutriScoreGrade => {
  return value === 'a' || value === 'b' || value === 'c' || value === 'd' || value === 'e';
};

const getSegment = (grade: NutriScoreGrade): NutriScoreSegment => {
  return SEGMENTS.find((segment) => segment.grade === grade) ?? SEGMENTS[2];
};

export function NutriScoreBlock({ grade }: NutriScoreBlockProps) {
  if (!isNutriScoreGrade(grade)) {
    return null;
  }

  const segment = getSegment(grade);

  return (
    <View className="mt-4">
      <Typography
        className="mb-3"
        style={{
          color: COLORS.neutrals500,
          fontSize: 13,
          fontWeight: '400',
          textTransform: 'uppercase',
        }}
      >
        Nutri-Score
      </Typography>

      <View
        style={{
          position: 'relative',
        }}
      >
        <View
          className="flex-row"
          style={{
            height: BAR_HEIGHT,
            borderRadius: BAR_RADIUS,
          }}
        >
          {SEGMENTS.map((item, index) => {
            const isSelected = item.grade === grade;
            const isFirst = index === 0;
            const isLast = index === SEGMENTS.length - 1;

            return (
              <View
                key={item.grade}
                className="flex-1 items-center justify-center"
                style={{
                  backgroundColor: isSelected ? item.activeBackgroundColor : item.backgroundColor,
                  borderWidth: ACTIVE_SEGMENT_BORDER_WIDTH,
                  borderColor: isSelected ? item.activeBorderColor : item.backgroundColor,
                  borderTopLeftRadius: isFirst ? BAR_RADIUS : 0,
                  borderBottomLeftRadius: isFirst ? BAR_RADIUS : 0,
                  borderTopRightRadius: isLast ? BAR_RADIUS : 0,
                  borderBottomRightRadius: isLast ? BAR_RADIUS : 0,
                  marginLeft: index === 0 ? 0 : -ACTIVE_SEGMENT_BORDER_WIDTH,
                  zIndex: isSelected ? 2 : 1,
                }}
              >
                <Typography
                  variant="button"
                  style={{
                    color: COLORS.white,
                    fontSize: 15,
                    fontWeight: '500',
                    lineHeight: 18,
                  }}
                >
                  {item.grade.toUpperCase()}
                </Typography>
              </View>
            );
          })}
        </View>

        <View className="mt-1 flex-row">
          {SEGMENTS.map((item) => {
            const isSelected = item.grade === grade;

            return (
              <View key={item.grade} className="flex-1 items-center">
                {isSelected ? (
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: POINTER_WIDTH,
                      borderRightWidth: POINTER_WIDTH,
                      borderBottomWidth: POINTER_HEIGHT,
                      borderLeftColor: COLORS.transparent,
                      borderRightColor: COLORS.transparent,
                      borderBottomColor: COLORS.black,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="items-center px-4" style={{ marginTop: 10 }}>
          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-neutrals-900 font-semibold">
              {`Grade ${grade.toUpperCase()}`}
            </Text>
            <Text>
              {segment.description}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
