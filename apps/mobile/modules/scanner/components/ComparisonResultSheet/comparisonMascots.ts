import BestMascot from '../../../../assets/icons/mascot/best-mascot.svg';
import BestMascot2 from '../../../../assets/icons/mascot/best-mascot-2.svg';
import BestMascot3 from '../../../../assets/icons/mascot/best-mascot-3.svg';
import BestMascot4 from '../../../../assets/icons/mascot/best-mascot-4.svg';
import BestMascot5 from '../../../../assets/icons/mascot/best-mascot-5.svg';

interface ComparisonMascotVariant {
  bottomPercent: number;
  Component: typeof BestMascot;
}

const MASCOT_VARIANTS: ComparisonMascotVariant[] = [
  { Component: BestMascot, bottomPercent: 98 },
  { Component: BestMascot2, bottomPercent: 98 },
  { Component: BestMascot3, bottomPercent: 98 },
  { Component: BestMascot4, bottomPercent: 94 },
  { Component: BestMascot5, bottomPercent: 93 },
];

export const getMascotByProductKey = (productKey: string): ComparisonMascotVariant => {
  let hash = 0;
  for (let index = 0; index < productKey.length; index += 1) {
    hash = (hash * 31 + productKey.charCodeAt(index)) >>> 0;
  }

  return MASCOT_VARIANTS[hash % MASCOT_VARIANTS.length];
};

