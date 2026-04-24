import { useCallback, useState } from 'react';
import { toast } from '@backpackapp-io/react-native-toast';
import { isActiveSubscriptionStatus } from '@acme/shared';
import { useQueryClient } from '@tanstack/react-query';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import {
  fetchUserSubscription,
  getSubscriptionQueryKey,
} from '../../profile/api/profileQueries';

interface UseFamilyMembersPaywallParams {
  hasAccess: boolean;
  userId?: string;
}

const ACTIVATION_RETRY_DELAY_MS = 1_500;
const ACTIVATION_RETRY_ATTEMPTS = 3;
const PAYWALL_OFFERING_ID = 'chozr';
const SUBSCRIPTION_ERROR_MESSAGE = 'Subscriptions are temporarily unavailable. Please try again.';
const ACTIVATION_PENDING_MESSAGE = 'Your subscription is activating. Please try again in a moment.';

const sleep = async (delayMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export function useFamilyMembersPaywall({ hasAccess, userId }: UseFamilyMembersPaywallParams) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const waitForSubscriptionActivation = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    for (let attempt = 0; attempt < ACTIVATION_RETRY_ATTEMPTS; attempt += 1) {
      const subscription = await queryClient.fetchQuery({
        queryKey: getSubscriptionQueryKey(userId),
        queryFn: fetchUserSubscription,
        staleTime: 0,
      });

      if (isActiveSubscriptionStatus(subscription.subscriptionStatus)) {
        return true;
      }

      if (attempt < ACTIVATION_RETRY_ATTEMPTS - 1) {
        await sleep(ACTIVATION_RETRY_DELAY_MS);
      }
    }

    return false;
  }, [queryClient, userId]);

  const presentPaywall = useCallback(async () => {
    if (hasAccess) {
      return true;
    }

    if (!userId || isPending) {
      return false;
    }

    setIsPending(true);

    try {
      await Purchases.logIn(userId);
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all[PAYWALL_OFFERING_ID];

      if (!offering) {
        toast.error(SUBSCRIPTION_ERROR_MESSAGE);
        return false;
      }

      const paywallResult = await RevenueCatUI.presentPaywall({ offering });

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED: {
          const hasActivatedSubscription = await waitForSubscriptionActivation();

          if (!hasActivatedSubscription) {
            toast.error(ACTIVATION_PENDING_MESSAGE);
            return false;
          }

          return true;
        }
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
        default:
          return false;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : SUBSCRIPTION_ERROR_MESSAGE);
      return false;
    } finally {
      setIsPending(false);
    }
  }, [hasAccess, isPending, userId, waitForSubscriptionActivation]);

  const handleAddAttempt = useCallback(
    async (onUnlocked: () => void) => {
      if (hasAccess) {
        onUnlocked();
        return true;
      }

      const hasUnlockedAccess = await presentPaywall();

      if (hasUnlockedAccess) {
        onUnlocked();
      }

      return hasUnlockedAccess;
    },
    [hasAccess, presentPaywall],
  );

  return {
    presentPaywall,
    handleAddAttempt,
    isPending,
  };
}

