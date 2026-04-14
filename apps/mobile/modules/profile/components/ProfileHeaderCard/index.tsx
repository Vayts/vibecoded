import { Pencil } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileHeaderCardProps {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  fallbackImageUrl?: string | null;
  onEditPress: () => void;
}

export function ProfileHeaderCard({
  name,
  email,
  avatarUrl,
  fallbackImageUrl,
  onEditPress,
}: ProfileHeaderCardProps) {
  return (
    <View className="rounded-[22px] px-4 py-4" style={{ backgroundColor: COLORS.primary }}>
      <View className="flex-row items-center gap-4">
        <UserAvatar
          imageUrl={avatarUrl}
          fallbackImageUrl={fallbackImageUrl}
          name={name}
          size="lg"
          className="border-2 border-white/70"
        />
        <View className="flex-1">
          <Typography variant="sectionTitle" className="text-white">
            {name}
          </Typography>
          {email ? (
            <Typography variant="bodySecondary" className="mt-1 text-white/80">
              {email}
            </Typography>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          className="h-11 w-11 items-center justify-center rounded-full"
          onPress={onEditPress}
        >
          <Pencil color={COLORS.white} size={20} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
