import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { pickAndUploadAvatarImage, type AvatarImageSource } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useDeleteFamilyMember, useUpdateFamilyMember } from '../../hooks/useFamilyMembers';
import { useEditableFamilyMember } from '../../hooks/useEditableFamilyMember';
import { useFamilyMemberFormStore } from '../../stores/familyMemberFormStore';

const UPDATE_MEMBER_ERROR_MESSAGE = 'Unable to update family member';
const UPLOAD_AVATAR_ERROR_MESSAGE = 'Unable to upload avatar';
const DELETE_MEMBER_ERROR_MESSAGE = 'Unable to remove family member';
type EditFamilyMemberPath = '/edit-family-member-main-goal' | '/edit-family-member-restrictions' | '/edit-family-member-allergies' | '/edit-family-member-preferences';

export function useEditFamilyMemberScreen() {
  const router = useRouter();
  const { member, memberId, isLoading } = useEditableFamilyMember();
  const draft = useFamilyMemberFormStore((state) => state.draft);
  const hydrateFromMember = useFamilyMemberFormStore((state) => state.hydrateFromMember);
  const reset = useFamilyMemberFormStore((state) => state.reset);
  const updateMutation = useUpdateFamilyMember();
  const deleteMutation = useDeleteFamilyMember();
  const [name, setName] = useState(member?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isAvatarActionPending, setIsAvatarActionPending] = useState(false);
  const [isNameSavePending, setIsNameSavePending] = useState(false);
  const [isRemoveDialogVisible, setIsRemoveDialogVisible] = useState(false);
  const [removeErrorMessage, setRemoveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(member?.name ?? '');
  }, [member?.name]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const closeAvatarMenu = () => {
    setIsAvatarMenuOpen(false);
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending || isAvatarActionPending;
  const currentName = member?.name ?? '';
  const isNameChanged = name.trim() !== currentName.trim();

  const handleNameChange = (value: string) => {
    setName(value);

    if (nameError) {
      setNameError(null);
    }
  };

  const handleAvatarSelection = async (source: AvatarImageSource) => {
    if (!memberId) {
      return;
    }

    closeAvatarMenu();
    setErrorMessage(null);
    setIsAvatarActionPending(true);

    try {
      const nextAvatarUrl = await pickAndUploadAvatarImage(source);

      if (!nextAvatarUrl) {
        return;
      }

      const updatedMember = await updateMutation.mutateAsync({
        id: memberId,
        data: { avatarUrl: nextAvatarUrl },
      });
      hydrateFromMember(updatedMember);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : UPLOAD_AVATAR_ERROR_MESSAGE);
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!memberId) {
      return;
    }

    closeAvatarMenu();
    setErrorMessage(null);
    setIsAvatarActionPending(true);

    try {
      const updatedMember = await updateMutation.mutateAsync({
        id: memberId,
        data: { avatarUrl: null },
      });
      hydrateFromMember(updatedMember);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : UPDATE_MEMBER_ERROR_MESSAGE);
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  const handleSave = async () => {
    if (!memberId || !member) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 30) {
      setNameError('Please enter a name up to 30 characters.');
      return;
    }

    setNameError(null);
    setErrorMessage(null);
    setIsNameSavePending(true);

    try {
      const updatedMember = await updateMutation.mutateAsync({
        id: memberId,
        data: { name: trimmedName },
      });
      hydrateFromMember(updatedMember);
      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : UPDATE_MEMBER_ERROR_MESSAGE);
    } finally {
      setIsNameSavePending(false);
    }
  };

  const handleOpenRemoveDialog = () => {
    if (!memberId || !member) {
      return;
    }

    setRemoveErrorMessage(null);
    setIsRemoveDialogVisible(true);
  };

  const handleCloseRemoveDialog = () => {
    if (deleteMutation.isPending) {
      return;
    }

    setIsRemoveDialogVisible(false);
    setRemoveErrorMessage(null);
  };

  const handleConfirmRemove = async () => {
    if (!memberId) {
      return;
    }

    setRemoveErrorMessage(null);

    try {
      await deleteMutation.mutateAsync(memberId);
      setIsRemoveDialogVisible(false);
      router.back();
    } catch (error) {
      setRemoveErrorMessage(
        error instanceof Error ? error.message : DELETE_MEMBER_ERROR_MESSAGE,
      );
    }
  };

  const navigateToEditScreen = (pathname: EditFamilyMemberPath) => {
    if (!memberId) {
      return;
    }

    router.push({
      pathname,
      params: { id: memberId },
    });
  };

  const handleEditMainGoal = () => {
    navigateToEditScreen('/edit-family-member-main-goal');
  };

  const handleEditRestrictions = () => {
    navigateToEditScreen('/edit-family-member-restrictions');
  };

  const handleEditAllergies = () => {
    navigateToEditScreen('/edit-family-member-allergies');
  };

  const handleEditPreferences = () => {
    navigateToEditScreen('/edit-family-member-preferences');
  };

  return {
    member,
    memberId,
    isLoading,
    draft,
    name,
    nameError,
    errorMessage,
    isBusy,
    isAvatarMenuOpen,
    isNameChanged,
    isNameSavePending,
    isRemoveDialogVisible,
    removeErrorMessage,
    isRemovePending: deleteMutation.isPending,
    closeAvatarMenu,
    setIsAvatarMenuOpen,
    handleNameChange,
    handleAvatarSelection,
    handleAvatarDelete,
    handleSave,
    handleOpenRemoveDialog,
    handleCloseRemoveDialog,
    handleConfirmRemove,
    handleEditMainGoal,
    handleEditRestrictions,
    handleEditAllergies,
    handleEditPreferences,
  };
}