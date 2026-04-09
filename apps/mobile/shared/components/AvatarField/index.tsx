import { View } from 'react-native';
import { Button } from '../Button';
import { Typography } from '../Typography';
import { UserAvatar } from '../UserAvatar';

interface AvatarFieldProps {
  name?: string | null;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
  isUploading?: boolean;
  canRemove?: boolean;
  helperText?: string;
  onChangePress: () => void;
  onRemovePress?: () => void;
}

export function AvatarField({
  name,
  imageUrl,
  fallbackImageUrl,
  isUploading = false,
  canRemove = false,
  helperText,
  onChangePress,
  onRemovePress,
}: AvatarFieldProps) {
  const hasVisibleAvatar = Boolean(imageUrl || fallbackImageUrl);

  return (
    <View className="items-center">
      <UserAvatar imageUrl={imageUrl} fallbackImageUrl={fallbackImageUrl} name={name} size="lg" />

      <View className="mt-4 flex-row flex-wrap justify-center gap-3">
        <Button
          label={hasVisibleAvatar ? 'Change photo' : 'Add photo'}
          onPress={onChangePress}
          variant="secondary"
          size="sm"
          loading={isUploading}
          disabled={isUploading}
        />

        {canRemove && onRemovePress ? (
          <Button
            label="Remove photo"
            onPress={onRemovePress}
            variant="destructive"
            size="sm"
            disabled={isUploading}
          />
        ) : null}
      </View>

      {helperText ? (
        <Typography variant="caption" className="mt-3 text-center text-gray-500">
          {helperText}
        </Typography>
      ) : null}
    </View>
  );
}