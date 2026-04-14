import { Heart } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { COLORS } from '../../../../shared/constants/colors';
import { useToggleFavouriteMutation } from '../../../scans/hooks/useFavouritesQuery';

interface FavouriteButtonProps {
  productId: string;
  isFavourite: boolean;
}

export function FavouriteButton({ productId, isFavourite }: FavouriteButtonProps) {
  const { toggle, isLoading } = useToggleFavouriteMutation();
  const [optimistic, setOptimistic] = useState(isFavourite);

  useEffect(() => {
    setOptimistic(isFavourite);
  }, [isFavourite]);

  const handlePress = () => {
    if (isLoading) return;
    const next = !optimistic;
    setOptimistic(next);
    toggle(productId, !next);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={optimistic ? 'Remove from favourites' : 'Add to favourites'}
      className="h-11 w-11 items-center justify-center rounded-full"
    >
      <Heart
        size={20}
        strokeWidth={1.5}
        color={optimistic ? COLORS.accent : COLORS.neutrals500}
        fill={optimistic ? COLORS.accent : 'none'}
      />
    </TouchableOpacity>
  );
}
