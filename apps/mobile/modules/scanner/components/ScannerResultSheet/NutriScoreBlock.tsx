import type { BarcodeLookupProduct } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface NutriScoreBlockProps {
  grade: BarcodeLookupProduct['scores']['nutriscore_grade'];
}

type NutriScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

interface NutriScoreSegment {
  grade: NutriScoreGrade;
  backgroundClassName: string;
  backgroundColor: string;
}

const SEGMENT_WIDTH = 40;
const INDICATOR_SIZE = 56;

const SEGMENTS: NutriScoreSegment[] = [
  { grade: 'a', backgroundClassName: 'bg-green-700', backgroundColor: COLORS.success },
  { grade: 'b', backgroundClassName: 'bg-lime-500', backgroundColor: '#84CC16' },
  { grade: 'c', backgroundClassName: 'bg-yellow-400', backgroundColor: '#FACC15' },
  { grade: 'd', backgroundClassName: 'bg-orange-400', backgroundColor: '#FB923C' },
  { grade: 'e', backgroundClassName: 'bg-orange-600', backgroundColor: '#EA580C' },
];

const BAR_WIDTH = SEGMENTS.length * SEGMENT_WIDTH;

const isNutriScoreGrade = (value: string | null | undefined): value is NutriScoreGrade => {
  return value === 'a' || value === 'b' || value === 'c' || value === 'd' || value === 'e';
};

const getIndicatorLeft = (grade: NutriScoreGrade): number => {
  const gradeIndex = SEGMENTS.findIndex((segment) => segment.grade === grade);

  return gradeIndex * SEGMENT_WIDTH + (SEGMENT_WIDTH - INDICATOR_SIZE) / 2;
};

const getIndicatorColor = (grade: NutriScoreGrade): string => {
  return SEGMENTS.find((segment) => segment.grade === grade)?.backgroundColor ?? COLORS.warning;
};

export function NutriScoreBlock({ grade }: NutriScoreBlockProps) {
  if (!isNutriScoreGrade(grade)) {
    return null;
  }

  return (
    <View className="mt-3">
      <Typography variant="fieldLabel" className="mb-2 text-gray-500">
        Nutri-Score
      </Typography>

      <View
        className={grade === 'a' ? 'relative ml-3' : 'relative'}
        style={{ width: BAR_WIDTH, height: INDICATOR_SIZE }}
      >
        <View
          className="absolute left-0 top-[8px] h-10 flex-row overflow-hidden rounded-full"
          style={{ width: BAR_WIDTH }}
        >
          {SEGMENTS.map((segment, index) => {
            const isActive = segment.grade === grade;
            const segmentRadiusClassName =
              index === 0
                ? 'rounded-l-full'
                : index === SEGMENTS.length - 1
                  ? 'rounded-r-full'
                  : '';

            return (
              <View
                key={segment.grade}
                className={`h-10 w-10 items-center justify-center ${segment.backgroundClassName} ${segmentRadiusClassName}`.trim()}
              >
                <Typography
                  variant="button"
                  className={isActive ? 'text-white opacity-100' : 'text-white/60 opacity-80'}
                >
                  {segment.grade.toUpperCase()}
                </Typography>
              </View>
            );
          })}
        </View>

        <View
          className="absolute top-0 items-center justify-center rounded-full border-4 border-white shadow-sm"
          style={{
            left: getIndicatorLeft(grade),
            width: INDICATOR_SIZE,
            height: INDICATOR_SIZE,
            backgroundColor: getIndicatorColor(grade),
          }}
        >
          <Typography variant="pageTitle" className="text-white">
            {grade.toUpperCase()}
          </Typography>
        </View>
      </View>
    </View>
  );
}
