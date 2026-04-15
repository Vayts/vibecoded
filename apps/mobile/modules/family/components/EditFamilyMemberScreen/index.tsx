import { Stack } from 'expo-router';
import { Pen } from 'lucide-react-native';
import { useState } from 'react';
import { Keyboard, Pressable, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../../shared/components/Button';
import { ConfirmationDialog } from '../../../../shared/components/ConfirmationDialog';
import { ScreenHeader } from '../../../../shared/components/ScreenHeader';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import { EditAccountField } from '../../../profile/components/EditAccountScreen/EditAccountField';
import { EditAvatarOptionsMenu } from '../../../profile/components/EditAccountScreen/EditAvatarOptionsMenu';
import {
  getFamilyMemberAllergiesSummary,
  getFamilyMemberMainGoalSummary,
  getFamilyMemberPreferencesSummary,
  getFamilyMemberRestrictionsSummary,
} from '../../lib/familyMemberHelpers';
import {
  DEFAULT_STICKY_FOOTER_HEIGHT,
  FamilyMemberStickyFooter,
} from '../FamilyMemberStickyFooter';
import { HealthProfileSection } from './HealthProfileSection';
import { useEditFamilyMemberScreen } from './useEditFamilyMemberScreen';

export function EditFamilyMemberScreen() {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(DEFAULT_STICKY_FOOTER_HEIGHT);
  const {
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
    isRemovePending,
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
  } = useEditFamilyMemberScreen();

  if (isLoading) {
    return <ScreenSpinner />;
  }

  if (!member || !memberId) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Typography variant="sectionTitle" className="text-gray-900">
          Member not found
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">
          This family member may have been removed.
        </Typography>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => <ScreenHeader title="Family member" centerTitle />,
        }}
      />

      <View className="flex-1">
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: footerHeight + 16,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            className="flex-1"
            onPress={() => {
              Keyboard.dismiss();

              if (isAvatarMenuOpen) {
                closeAvatarMenu();
              }
            }}
          >
            <View className="items-center pt-2" style={{ zIndex: isAvatarMenuOpen ? 20 : 1 }}>
              <View className="relative items-center">
                <UserAvatar imageUrl={draft.avatarUrl} name={name || member.name} size="xl" />

                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Open family member photo options"
                  className="absolute -bottom-0.5 right-0 h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                  disabled={isBusy}
                  onPress={() => {
                    setIsAvatarMenuOpen((current) => !current);
                  }}
                >
                  <Pen color={COLORS.white} size={16} strokeWidth={2.2} />
                </TouchableOpacity>

                {isAvatarMenuOpen ? (
                  <EditAvatarOptionsMenu
                    canDelete={Boolean(draft.avatarUrl)}
                    onDelete={() => {
                      void handleAvatarDelete();
                    }}
                    onSelectCamera={() => {
                      void handleAvatarSelection('camera');
                    }}
                    onSelectGallery={() => {
                      void handleAvatarSelection('gallery');
                    }}
                  />
                ) : null}
              </View>
            </View>

            <View className="mt-2">
              <EditAccountField
                label="Name"
                value={name}
                error={nameError}
                maxLength={30}
                onChangeText={handleNameChange}
              />

              <HealthProfileSection
                mainGoalSummary={getFamilyMemberMainGoalSummary(draft)}
                restrictionsSummary={getFamilyMemberRestrictionsSummary(draft)}
                allergiesSummary={getFamilyMemberAllergiesSummary(draft)}
                preferencesSummary={getFamilyMemberPreferencesSummary(draft)}
                onPressMainGoal={handleEditMainGoal}
                onPressRestrictions={handleEditRestrictions}
                onPressAllergies={handleEditAllergies}
                onPressPreferences={handleEditPreferences}
              />
            </View>
          </Pressable>
        </KeyboardAwareScrollView>

        <FamilyMemberStickyFooter
          bottomInset={insets.bottom}
          errorMessage={errorMessage}
          onLayoutHeight={(nextHeight) => {
            if (nextHeight !== footerHeight) {
              setFooterHeight(nextHeight);
            }
          }}
        >
          <Button
            fullWidth
            label="Save changes"
            disabled={!isNameChanged || isBusy}
            loading={isNameSavePending}
            onPress={() => {
              void handleSave();
            }}
          />

          <View className="mt-4">
            <Button
              fullWidth
              label="Remove member"
              variant="destructive"
              disabled={isBusy}
              onPress={handleOpenRemoveDialog}
            />
          </View>
        </FamilyMemberStickyFooter>

        <ConfirmationDialog
          visible={isRemoveDialogVisible}
          title={`Remove ${member.name}?`}
          description="Their preferences will no longer appear in personal analysis."
          confirmLabel="Remove"
          errorMessage={removeErrorMessage}
          isPending={isRemovePending}
          onCancel={handleCloseRemoveDialog}
          onConfirm={() => {
            void handleConfirmRemove();
          }}
        />
      </View>
    </View>
  );
}
