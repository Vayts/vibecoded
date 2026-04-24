import React from 'react';
import { View } from 'react-native';

import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';

interface ProfileSubscriptionCardProps {
  hasAccess: boolean;
  isPending?: boolean;
  onUpgrade: () => void;
  subscriptionExpiry?: string | null;
  subscriptionPlan?: string | null;
}

const formatSubscriptionPlan = (subscriptionPlan?: string | null): string | null => {
  switch (subscriptionPlan) {
    case 'pro_monthly':
      return 'Monthly plan';
    case 'pro_annual':
      return 'Annual plan';
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

export function ProfileSubscriptionCard({
  hasAccess,
  isPending = false,
  onUpgrade,
  subscriptionExpiry,
  subscriptionPlan,
}: ProfileSubscriptionCardProps) {
  const planLabel = formatSubscriptionPlan(subscriptionPlan);
  const expiryLabel = formatSubscriptionExpiry(subscriptionExpiry);

  return (
    <View className="mt-8 rounded-[22px] border border-gray-200 bg-gray-50 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Typography variant="sectionTitle" className="text-neutrals-900 font-bold">
            Subscription
          </Typography>
          <Typography variant="body" className="mt-2 font-semibold text-neutrals-900">
            {hasAccess ? 'Premium is active' : 'You are on Free'}
          </Typography>
          <Typography variant="bodySecondary" className="mt-2 leading-5 text-neutrals-600">
            {hasAccess
              ? 'Family members are unlocked on this account, so you can manage everyone from one place.'
              : 'Upgrade to unlock family members and keep your household preferences together.'}
          </Typography>
          {hasAccess && (planLabel || expiryLabel) ? (
            <Typography variant="caption" className="mt-3 text-neutrals-500">
              {[planLabel, expiryLabel ? `Active until ${expiryLabel}` : null]
                .filter(Boolean)
                .join(' • ')}
            </Typography>
          ) : null}
        </View>

        <View
          className={`rounded-full px-3 py-1 ${
            hasAccess ? 'bg-primary-100' : 'border border-gray-200 bg-white'
          }`}
        >
          <Typography
            variant="bodySecondary"
            className={`font-semibold ${hasAccess ? 'text-primary-900' : 'text-neutrals-700'}`}
          >
            {hasAccess ? 'Premium' : 'Free'}
          </Typography>
        </View>
      </View>

      {!hasAccess ? (
        <View className="mt-4">
          <Button
            label="Upgrade"
            size="md"
            loading={isPending}
            accessibilityLabel="Upgrade to unlock family members"
            onPress={onUpgrade}
          />
        </View>
      ) : null}
    </View>
  );
}

