import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface NutriScoreBlockProps {
  grade: string | null | undefined;
}

type NutriScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

interface NutriScoreSegment {
  grade: NutriScoreGrade;
  backgroundColor: string;
  badgeTextColor: string;
  position: number;
}

export const NUTRI_SCORE_BLOCK_ESTIMATED_HEIGHT = 78;

const BAR_WIDTH = 170;
const BAR_HEIGHT = 24;
const BAR_RADIUS = 12;
const BADGE_BORDER_WIDTH = 2;
const BADGE_WIDTH = 24 + BADGE_BORDER_WIDTH * 2;
const BADGE_HEIGHT = 32;
const BADGE_RADIUS = 10;
const BAR_TOP = 4;
const BADGE_TOP = 0;

const SEGMENTS: NutriScoreSegment[] = [
  { grade: 'a', backgroundColor: '#157F3E', badgeTextColor: COLORS.white, position: 12 },
  { grade: 'b', backgroundColor: '#83CB16', badgeTextColor: COLORS.white, position: 30 },
  { grade: 'c', backgroundColor: '#B3CB17', badgeTextColor: COLORS.white, position: 43 },
  { grade: 'd', backgroundColor: '#FCCB18', badgeTextColor: COLORS.white, position: 63 },
  { grade: 'e', backgroundColor: '#EB580A', badgeTextColor: COLORS.white, position: 87 },
];

export const isNutriScoreGrade = (value: string | null | undefined): value is NutriScoreGrade => {
  return value === 'a' || value === 'b' || value === 'c' || value === 'd' || value === 'e';
};

const getSegment = (grade: NutriScoreGrade): NutriScoreSegment => {
  return SEGMENTS.find((segment) => segment.grade === grade) ?? SEGMENTS[2];
};

const getTopRoundedBarPath = () => {
  const right = BAR_WIDTH;
  const bottom = BAR_HEIGHT;

  return [
    `M 0 ${bottom}`,
    `L 0 ${BAR_RADIUS}`,
    `Q 0 0 ${BAR_RADIUS} 0`,
    `L ${right - BAR_RADIUS} 0`,
    `Q ${right} 0 ${right} ${BAR_RADIUS}`,
    `L ${right} ${bottom}`,
    'Z',
  ].join(' ');
};

export function NutriScoreBlock({ grade }: NutriScoreBlockProps) {
  if (!isNutriScoreGrade(grade)) {
    return null;
  }

  const segment = getSegment(grade);

  return (
    <View className="mt-3">
      <Typography variant="fieldLabel" className="mb-2 text-gray-500">
        Nutri-Score
      </Typography>

      <View
        style={{
          width: '100%',
          maxWidth: BAR_WIDTH,
          height: BADGE_HEIGHT,
          position: 'relative',
        }}
      >
        <View
          className="absolute left-0 overflow-hidden"
          style={{
            top: BAR_TOP,
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            backgroundColor: COLORS.white,
          }}
        >
          <Svg width="100%" height={BAR_HEIGHT} viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="nutriScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#157F3E" />
                <Stop offset="25%" stopColor="#83CB16" />
                <Stop offset="34.9%" stopColor="#B3CB17" />
                <Stop offset="50%" stopColor="#FCCB18" />
                <Stop offset="75%" stopColor="#FA913E" />
                <Stop offset="100%" stopColor="#EB580A" />
              </LinearGradient>
            </Defs>
            <Path d={getTopRoundedBarPath()} fill="url(#nutriScoreGradient)" />
          </Svg>
        </View>

        <View className="border border-neutrals-100 border-t-0 h-2 w-full absolute -bottom-1"/>

        <View
          className="absolute items-center justify-center"
          style={{
            top: BADGE_TOP,
            left: `${segment.position}%`,
            width: BADGE_WIDTH,
            height: BADGE_HEIGHT,
            borderRadius: BADGE_RADIUS,
            borderWidth: BADGE_BORDER_WIDTH,
            borderColor: COLORS.white,
            backgroundColor: segment.backgroundColor,
            transform: [{ translateX: -BADGE_WIDTH / 2 }],
            shadowColor: COLORS.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Typography
            variant="button"
            className="text-[18px] leading-[20px]"
            style={{ color: segment.badgeTextColor }}
          >
            {grade.toUpperCase()}
          </Typography>
        </View>
      </View>
    </View>
  );
}
