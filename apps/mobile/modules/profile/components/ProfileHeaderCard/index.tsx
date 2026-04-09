import { View } from 'react-native';

import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { Typography } from '../../../../shared/components/Typography';

interface ProfileHeaderCardProps {
  name: string;
  email?: string | null;
  statusText?: string | null;
  avatarUrl?: string | null;
  fallbackImageUrl?: string | null;
}

export function ProfileHeaderCard({
  name,
  email,
  statusText,
  avatarUrl,
  fallbackImageUrl,
}: ProfileHeaderCardProps) {
  return (
    <View className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-5">
      <View className="flex-row items-center gap-4">
        <UserAvatar imageUrl={avatarUrl} fallbackImageUrl={fallbackImageUrl} name={name} size="lg" />
        <View className="flex-1">
          <Typography variant="pageTitle" className="text-gray-900">
            {name}
          </Typography>
          {email ? (
            <Typography variant="bodySecondary" className="mt-1 text-gray-500">
              {email}
            </Typography>
          ) : null}
          {statusText ? (
            <Typography variant="caption" className="mt-3 text-blue-600">
              {statusText}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}
