import type { UserSubscriptionResponse } from '@acme/shared';

export type SubscriptionCardMockState =
  | 'monthly'
  | 'yearly'
  | 'expired'
  | 'free'
  | 'all';

export interface SubscriptionCardMockScenario {
  key: Exclude<SubscriptionCardMockState, 'all'>;
  hasAccess: boolean;
  subscription: UserSubscriptionResponse;
}

const addDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const SUBSCRIPTION_CARD_MOCK_SCENARIOS: Record<
  Exclude<SubscriptionCardMockState, 'all'>,
  SubscriptionCardMockScenario
> = {
  monthly: {
    key: 'monthly',
    hasAccess: true,
    subscription: {
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro_monthly',
      subscriptionExpiry: addDays(30),
      isPro: true,
      freeGenerationsBalance: 0,
    },
  },
  yearly: {
    key: 'yearly',
    hasAccess: true,
    subscription: {
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro_annual',
      subscriptionExpiry: addDays(365),
      isPro: true,
      freeGenerationsBalance: 0,
    },
  },
  expired: {
    key: 'expired',
    hasAccess: false,
    subscription: {
      subscriptionStatus: 'expired',
      subscriptionPlan: 'pro_monthly',
      subscriptionExpiry: addDays(-1),
      isPro: false,
      freeGenerationsBalance: 0,
    },
  },
  free: {
    key: 'free',
    hasAccess: false,
    subscription: {
      subscriptionStatus: null,
      subscriptionPlan: null,
      subscriptionExpiry: null,
      isPro: false,
      freeGenerationsBalance: 5,
    },
  },
};

export const getSubscriptionCardMockScenario = (
  state?: Exclude<SubscriptionCardMockState, 'all'>,
): SubscriptionCardMockScenario | null => {
  if (!state) {
    return null;
  }

  return SUBSCRIPTION_CARD_MOCK_SCENARIOS[state] ?? null;
};

export const getAllSubscriptionCardMockScenarios = (): SubscriptionCardMockScenario[] => {
  return [
    SUBSCRIPTION_CARD_MOCK_SCENARIOS.monthly,
    SUBSCRIPTION_CARD_MOCK_SCENARIOS.yearly,
    SUBSCRIPTION_CARD_MOCK_SCENARIOS.expired,
    SUBSCRIPTION_CARD_MOCK_SCENARIOS.free,
  ];
};

