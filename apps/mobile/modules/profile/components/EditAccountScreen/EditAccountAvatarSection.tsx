import React from 'react';
import { Pen } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import type { AuthUser } from '../../../../shared/lib/auth/client';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import type { AvatarImageSource } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { EditAvatarOptionsMenu } from './EditAvatarOptionsMenu';

interface EditAccountAvatarSectionProps {
  currentAvatarUrl: string | null;
  fallbackImageUrl: string | null;
  isBusy: boolean;
  isMenuOpen: boolean;
  name: string;
  user: AuthUser;
  onDelete: () => Promise<void>;
  onSelect: (source: AvatarImageSource) => Promise<void>;
  onToggleMenu: () => void;
}

export function EditAccountAvatarSection({
  currentAvatarUrl,
  fallbackImageUrl,
  isBusy,
  isMenuOpen,
  name,
  user,
  onDelete,
  onSelect,
  onToggleMenu,
}: EditAccountAvatarSectionProps) {
  return (
    <View className="items-center pt-0" style={{ zIndex: isMenuOpen ? 20 : 1 }}>
      <View className="relative items-center">
        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Edit profile photo"
          disabled={isBusy}
          onPress={onToggleMenu}
        >
          <UserAvatar
            imageUrl={currentAvatarUrl}
            fallbackImageUrl={fallbackImageUrl}
            name={name || user.name}
            size="xl"
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open profile photo options"
          className="absolute -bottom-0.5 right-0 h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: COLORS.primary }}
          disabled={isBusy}
          onPress={onToggleMenu}
        >
          <Pen color={COLORS.white} size={16} strokeWidth={2.2} />
        </TouchableOpacity>

        {isMenuOpen ? (
          <EditAvatarOptionsMenu
            canDelete={Boolean(currentAvatarUrl || fallbackImageUrl)}
            onDelete={() => {
              void onDelete();
            }}
            onSelectCamera={() => {
              void onSelect('camera');
            }}
            onSelectGallery={() => {
              void onSelect('gallery');
            }}
          />
        ) : null}
      </View>
    </View>
  );
}


