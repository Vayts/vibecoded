import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SheetManager } from 'react-native-actions-sheet';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmationDialog } from '../../../../shared/components/ConfirmationDialog';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { Typography } from '../../../../shared/components/Typography';
import { getUserFallbackAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useFamilyMembersAccess } from '../../../family/hooks/useFamilyMembersAccess';
import { useFamilyMembersPaywall } from '../../../family/hooks/useFamilyMembersPaywall';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import { MAIN_GOAL_LABELS } from '../../../onboarding/components/options';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useCurrentUserQuery } from '../../api/profileQueries';
import { useDeleteAccount } from '../../hooks/useDeleteAccount';
import { ProfileAccountActionsSection } from './ProfileAccountActionsSection';
import { ProfileFamilyMembersSection } from './ProfileFamilyMembersSection';
import { ProfileSubscriptionCard } from './ProfileSubscriptionCard';
import { ProfileGoalCard } from '../ProfileGoalCard';
import { ProfileHeaderCard } from '../ProfileHeaderCard';

const getHealthSummary = (onboarding: ReturnType<typeof useOnboardingQuery>['data']): string => {
  if (!onboarding?.mainGoal) {
    return 'Set your health goal';
  }

  return MAIN_GOAL_LABELS[onboarding.mainGoal];
};

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, setUser, signOut, user: authUser } = useAuthStore();
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const user = currentUserQuery.data ?? authUser;
  const onboardingQuery = useOnboardingQuery(user?.id);
  const familyMembersAccess = useFamilyMembersAccess();
  const deleteAccountMutation = useDeleteAccount();
  const familyMembersPaywall = useFamilyMembersPaywall({
    hasAccess: familyMembersAccess.hasAccess,
    userId: user?.id,
  });
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  const handleOpenLogoutDialog = () => {
    setLogoutErrorMessage(null);
    setIsLogoutDialogVisible(true);
  };

  const handleCloseLogoutDialog = () => {
    if (isLoading) {
      return;
    }

    setIsLogoutDialogVisible(false);
    setLogoutErrorMessage(null);
  };

  const handleConfirmLogout = async () => {
    setLogoutErrorMessage(null);

    try {
      await signOut();
      setIsLogoutDialogVisible(false);
    } catch (error) {
      setLogoutErrorMessage(error instanceof Error ? error.message : 'Unable to log out');
    }
  };

  const handleOpenDeleteAccountSheet = () => {
    if (deleteAccountMutation.isPending) {
      return;
    }

    void SheetManager.show(SheetsEnum.DeleteAccountSheet, {
      payload: {
        onConfirm: async () => {
          await deleteAccountMutation.mutateAsync();
        },
      },
    });
  };

  if (!user) {
    return <ScreenSpinner />;
  }

  if (onboardingQuery.isLoading || familyMembersAccess.isLoading) {
    return <ScreenSpinner />;
  }

  const isAccountActionPending = isLoading || deleteAccountMutation.isPending;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 mb-4">
        <Typography variant="pageTitle">Profile</Typography>
      </View>

      <ScreenSheet>
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
          }}
        >
          <View className="px-4 bg-white pb-4">
            <View className="mt-6">
              <ProfileHeaderCard
                name={user.name || 'Your account'}
                email={user.email}
                avatarUrl={user.avatarUrl}
                fallbackImageUrl={getUserFallbackAvatarImage(user)}
                onEditPress={() => {
                  router.push('/edit-account');
                }}
              />
            </View>

            <View className="mt-8">
              <Typography variant="sectionTitle" className="text-neutrals-900 font-bold">
                Preferences
              </Typography>
              <ProfileGoalCard
                label="Your goal"
                description={getHealthSummary(onboardingQuery.data)}
                helperText="Your product analysis will be personalized based on your preferences."
                onPress={() => {
                  router.push('/edit-health');
                }}
              />
            </View>

            <ProfileSubscriptionCard
              hasAccess={familyMembersAccess.hasAccess}
              isPending={familyMembersPaywall.isPending}
              subscriptionPlan={familyMembersAccess.subscription?.subscriptionPlan}
              subscriptionExpiry={familyMembersAccess.subscription?.subscriptionExpiry}
              onUpgrade={() => {
                void familyMembersPaywall.presentPaywall();
              }}
            />

            <ProfileFamilyMembersSection
              canManage={familyMembersAccess.hasAccess}
              isAddPending={familyMembersPaywall.isPending}
              onAdd={() => {
                void familyMembersPaywall.handleAddAttempt(() => {
                  router.push('/add-family-member');
                });
              }}
              onEdit={(member) => {
                router.push({
                  pathname: '/edit-family-member',
                  params: { id: member.id },
                });
              }}
            />
          </View>

          <ProfileAccountActionsSection
            isPending={isAccountActionPending}
            onDeleteAccountPress={handleOpenDeleteAccountSheet}
            onLogoutPress={handleOpenLogoutDialog}
          />
        </ScrollView>
      </ScreenSheet>

      <ConfirmationDialog
        visible={isLogoutDialogVisible}
        title="Log out?"
        description="You will need to sign in again to access your account."
        confirmLabel="Log out"
        errorMessage={logoutErrorMessage}
        isPending={isAccountActionPending}
        onCancel={handleCloseLogoutDialog}
        onConfirm={() => {
          void handleConfirmLogout();
        }}
      />
    </View>
  );
}
