import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';

interface ProfileMenuSectionProps {
  title: string;
  children: ReactNode;
}

export function ProfileMenuSection({ title, children }: ProfileMenuSectionProps) {
  return (
    <View className="mt-6">
      <Typography variant="fieldLabel" className="mb-3 px-1 text-gray-500">
        {title}
      </Typography>
      <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {children}
      </View>
    </View>
  );
}
