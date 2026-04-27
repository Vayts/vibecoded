import React from 'react';
import { View } from 'react-native';

import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { Crown } from 'lucide-react-native';

interface ProfileSubscriptionCardProps {
  hasAccess: boolean;
  isPending?: boolean;
  onUpgrade: () => void;
  subscriptionExpiry?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
}

type SubscriptionCardState = 'active-monthly' | 'active-yearly' | 'active' | 'expired' | 'free';

const formatSubscriptionPlan = (subscriptionPlan?: string | null): string | null => {
  switch (subscriptionPlan) {
    case 'pro_monthly':
      return 'Monthly plan';
    case 'pro_annual':
      return 'Yearly plan';
    default:
      return null;
  }
};

const formatSubscriptionExpiry = (subscriptionExpiry?: string | null): string | null => {
  if (!subscriptionExpiry) {
    return null;
  }

  const parsedDate = new Date(subscriptionExpiry);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const isFutureSubscriptionExpiry = (subscriptionExpiry?: string | null): boolean => {
  if (!subscriptionExpiry) {
    return false;
  }

  const parsedDate = new Date(subscriptionExpiry);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.getTime() > Date.now();
};

const resolveCardState = (params: {
  hasAccess: boolean;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiry?: string | null;
}): SubscriptionCardState => {
  const hasActiveAccess =
    params.hasAccess ||
    params.subscriptionStatus === 'active' ||
    (params.subscriptionStatus === 'cancelled' &&
      isFutureSubscriptionExpiry(params.subscriptionExpiry));

  if (hasActiveAccess) {
    if (params.subscriptionPlan === 'pro_monthly') {
      return 'active-monthly';
    }

    if (params.subscriptionPlan === 'pro_annual') {
      return 'active-yearly';
    }

    return 'active';
  }

  if (
    params.subscriptionStatus === 'expired' ||
    params.subscriptionStatus === 'cancelled' ||
    params.subscriptionPlan ||
    params.subscriptionExpiry
  ) {
    return 'expired';
  }

  return 'free';
};

const getCardCopy = (params: {
  state: SubscriptionCardState;
  expiryLabel: string | null;
  planLabel: string | null;
}) => {
  switch (params.state) {
    case 'active-monthly':
    case 'active-yearly':
    case 'active':
      return {
        subtitle: params.expiryLabel ? `Active until ${params.expiryLabel}` : 'Premium is active',
        badgeLabel: params.planLabel ?? 'Premium',
        badgeStyle: {
          backgroundColor: COLORS.primary100,
          borderColor: COLORS.profileChipGoodBorder,
          textColor: COLORS.primary900,
        },
        iconColor: COLORS.primary700,
        buttonLabel: null,
      };
    case 'expired':
      return {
        subtitle: 'Premium features are locked',
        badgeLabel: 'Expired',
        badgeStyle: {
          backgroundColor: COLORS.danger50,
          borderColor: COLORS.profileChipBadBorder,
          textColor: COLORS.danger800,
        },
        iconColor: COLORS.danger500,
        buttonLabel: 'Upgrade again',
      };
    case 'free':
    default:
      return {
        subtitle: 'Unlock premium features',
        badgeLabel: 'Free',
        badgeStyle: {
          backgroundColor: COLORS.neutrals100,
          borderColor: COLORS.profileChipNeutralBorder,
          textColor: COLORS.neutrals700,
        },
        iconColor: COLORS.neutrals500,
        buttonLabel: 'Get Chozr Premium',
      };
  }
};

export function ProfileSubscriptionCard({
  hasAccess,
  isPending = false,
  onUpgrade,
  subscriptionExpiry,
  subscriptionPlan,
  subscriptionStatus,
}: ProfileSubscriptionCardProps) {
  const planLabel = formatSubscriptionPlan(subscriptionPlan);
  const expiryLabel = formatSubscriptionExpiry(subscriptionExpiry);
  const state = resolveCardState({
    hasAccess,
    subscriptionExpiry,
    subscriptionPlan,
    subscriptionStatus,
  });
  const copy = getCardCopy({ expiryLabel, planLabel, state });
  const shouldShowUpgrade = copy.buttonLabel !== null;

  return (
    <View className="mt-8 rounded-[16px] border border-gray-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Crown color={copy.iconColor} size={26} strokeWidth={1.75} />
            <View>
              <Typography className="text-[14px] text-neutrals-900 font-bold">
                Subscription
              </Typography>
              <Typography variant="bodySecondary" className="text-neutrals-500">
                {copy.subtitle}
              </Typography>
            </View>
          </View>
        </View>

        <View
          className="rounded-full border px-3 py-1"
          style={{
            backgroundColor: copy.badgeStyle.backgroundColor,
            borderColor: copy.badgeStyle.borderColor,
          }}
        >
          <Typography variant="bodySecondary" className="font-semibold" style={{ color: copy.badgeStyle.textColor }}>
            {copy.badgeLabel}
          </Typography>
        </View>
      </View>

      {shouldShowUpgrade ? (
        <View className="mt-4">
          <Button
            label={copy.buttonLabel ?? 'Get Chozr Premium'}
            size="sm"
            loading={isPending}
            accessibilityLabel="Upgrade to unlock family members"
            onPress={onUpgrade}
          />
        </View>
      ) : null}
    </View>
  );
}

