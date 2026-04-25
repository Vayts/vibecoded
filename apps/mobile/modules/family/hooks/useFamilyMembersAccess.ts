import { isActiveSubscriptionStatus } from '@acme/shared';
import { useAuthStore } from '../../../shared/stores/authStore';
import { useUserSubscriptionQuery } from '../../profile/api/profileQueries';

export function useFamilyMembersAccess() {
  const user = useAuthStore((state) => state.user);
  const subscriptionQuery = useUserSubscriptionQuery(user?.id);
  const hasAccess = isActiveSubscriptionStatus(
    subscriptionQuery.data?.subscriptionStatus,
  );

  return {
    hasAccess,
    isLoading: subscriptionQuery.isLoading,
    subscription: subscriptionQuery.data,
  };
}

