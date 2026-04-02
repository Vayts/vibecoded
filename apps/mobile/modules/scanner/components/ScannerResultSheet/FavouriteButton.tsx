import { Heart } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { COLORS } from '../../../../shared/constants/colors';
import { useToggleFavouriteMutation } from '../../../scans/hooks/useFavouritesQuery';

interface FavouriteButtonProps {
  productId: string;
  isFavourite: boolean;
}

export function FavouriteButton({ productId, isFavourite }: FavouriteButtonProps) {
  const { toggle, isLoading } = useToggleFavouriteMutation();

  const handlePress = () => {
    if (isLoading) return;
    toggle(productId, isFavourite);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
      className="h-11 w-11 items-center justify-center rounded-full"
    >
      <Heart
        size={20}
        strokeWidth={1.5}
        color={isFavourite ? COLORS.accent : COLORS.neutrals500}
        fill={isFavourite ? COLORS.accent : 'none'}
      />
    </TouchableOpacity>
  );
}
