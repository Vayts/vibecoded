import { View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';

interface ProfileHeaderCardProps {
  name: string;
  email?: string | null;
  statusText?: string | null;
}

const getInitials = (name: string) => {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'A';
};

export function ProfileHeaderCard({ name, email, statusText }: ProfileHeaderCardProps) {
  return (
    <View className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-5">
      <View className="flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
          <Typography variant="sectionTitle" className="text-white">
            {getInitials(name)}
          </Typography>
        </View>
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
