import { useState } from 'react';

import type { AuthUser } from '../../../../shared/lib/auth/client';
import {
  getUserFallbackAvatarImage,
  pickAndUploadAvatarImage,
  type AvatarImageSource,
} from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import type { UpdateProfilePayload } from '../../api/profileMutations';

const UPLOAD_AVATAR_ERROR_MESSAGE = 'Unable to upload avatar';

interface UseEditAccountAvatarParams {
  user: AuthUser | null | undefined;
  persistProfileUpdate: (payload: UpdateProfilePayload) => Promise<boolean>;
  setErrorMessage: (message: string | null) => void;
}

export function useEditAccountAvatar({
  user,
  persistProfileUpdate,
  setErrorMessage,
}: UseEditAccountAvatarParams) {
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isAvatarActionPending, setIsAvatarActionPending] = useState(false);

  const currentAvatarUrl = user?.avatarUrl ?? null;
  const fallbackImageUrl = getUserFallbackAvatarImage(user);

  const closeAvatarMenu = () => {
    setIsAvatarMenuOpen(false);
  };

  const toggleAvatarMenu = () => {
    setIsAvatarMenuOpen((current) => !current);
  };

  const handleAvatarSelection = async (source: AvatarImageSource) => {
    closeAvatarMenu();
    setErrorMessage(null);
    setIsAvatarActionPending(true);

    try {
      const nextAvatarUrl = await pickAndUploadAvatarImage(source);

      if (nextAvatarUrl) {
        await persistProfileUpdate({ avatarUrl: nextAvatarUrl });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : UPLOAD_AVATAR_ERROR_MESSAGE,
      );
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  const handleAvatarDelete = async () => {
    closeAvatarMenu();
    setIsAvatarActionPending(true);

    try {
      await persistProfileUpdate({ avatarUrl: null });
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  return {
    closeAvatarMenu,
    currentAvatarUrl,
    fallbackImageUrl,
    handleAvatarDelete,
    handleAvatarSelection,
    isAvatarActionPending,
    isAvatarMenuOpen,
    toggleAvatarMenu,
  };
}

