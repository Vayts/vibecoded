import { Image as ExpoImage } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { resolveStorageUri } from '../../lib/storage/resolveStorageUri';
import { Typography } from '../Typography';

type UserAvatarSize = 'xss' | 'sm' | 'md' | 'lg';

const AVATAR_SIZE_MAP: Record<UserAvatarSize, number> = {
  xss: 20,
  sm: 32,
  md: 44,
  lg: 64,
};

const AVATAR_TEXT_VARIANT: Record<UserAvatarSize, 'caption' | 'buttonSmall' | 'sectionTitle'> = {
  xss: 'caption',
  sm: 'caption',
  md: 'buttonSmall',
  lg: 'sectionTitle',
};

export interface UserAvatarProps {
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
  name?: string | null;
  size?: UserAvatarSize;
  className?: string;
}

const getInitials = (name?: string | null): string => {
  if (!name) return '';

  return name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export function UserAvatar({
  imageUrl,
  fallbackImageUrl,
  name,
  size = 'md',
  className,
}: UserAvatarProps) {
  const primaryUri = useMemo(() => resolveStorageUri(imageUrl), [imageUrl]);
  const secondaryUri = useMemo(() => resolveStorageUri(fallbackImageUrl), [fallbackImageUrl]);
  const [currentUri, setCurrentUri] = useState<string | null>(primaryUri ?? secondaryUri ?? null);

  useEffect(() => {
    setCurrentUri(primaryUri ?? secondaryUri ?? null);
  }, [primaryUri, secondaryUri]);

  const initials = getInitials(name);
  const sizePx = AVATAR_SIZE_MAP[size];

  const handleImageError = () => {
    if (currentUri === primaryUri && secondaryUri && secondaryUri !== primaryUri) {
      setCurrentUri(secondaryUri);
      return;
    }

    setCurrentUri(null);
  };

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${className ?? ''}`.trim()}
      style={{ width: sizePx, height: sizePx, backgroundColor: COLORS.primary }}
    >
      {currentUri ? (
        <ExpoImage
          source={{ uri: currentUri }}
          style={{ width: sizePx, height: sizePx }}
          contentFit="cover"
          onError={handleImageError}
        />
      ) : initials ? (
        <Typography variant={AVATAR_TEXT_VARIANT[size]} className="text-white">
          {initials}
        </Typography>
      ) : null}
    </View>
  );
}