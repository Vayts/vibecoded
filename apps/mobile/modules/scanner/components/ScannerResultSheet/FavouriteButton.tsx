import { Heart } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { COLORS } from '../../../../shared/constants/colors';
import { useToggleFavouriteMutation } from '../../../scans/hooks/useFavouritesQuery';
import { ResultSheetActionButton } from './ResultSheetActionButton';

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
    <ResultSheetActionButton
      label={optimistic ? 'Remove from favourites' : 'Add to favourites'}
      loading={isLoading}
      onPress={handlePress}
      icon={
        <Heart
          size={18}
          strokeWidth={1.8}
          color={optimistic ? COLORS.neutrals900 : COLORS.neutrals900}
          fill={optimistic ? COLORS.neutrals900 : 'none'}
        />
      }
    />
  );
}
