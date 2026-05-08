import type { ScannerProfileResult } from '@acme/shared';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { buildProfileSafetyBadges } from './profileSafetyBadgeUtils';

interface ProfileSafetyBadgesProps {
  profile: ScannerProfileResult;
}

const BADGE_COLORS = {
  negative: {
    backgroundColor: COLORS.danger50,
    borderColor: COLORS.dangerBorder,
    textColor: COLORS.danger800,
  },
  positive: {
    backgroundColor: COLORS.primary50,
    borderColor: COLORS.successBorder,
    textColor: COLORS.primary900,
  },
  warning: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    textColor: COLORS.accent900,
  },
} as const;

export function ProfileSafetyBadges({ profile }: ProfileSafetyBadgesProps) {
  const badges = useMemo(() => buildProfileSafetyBadges(profile), [profile]);

  if (badges.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Product safety traits"
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.row}>
        {badges.map((badge) => {
          const Icon = badge.Icon;
          const colors = BADGE_COLORS[badge.tone];

          return (
            <View
              key={badge.key}
              style={[
                styles.badge,
                {
                  backgroundColor: colors.backgroundColor,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Icon color={colors.textColor} size={12} strokeWidth={1.5} />
              <Typography variant="caption" style={[styles.label, { color: colors.textColor }]}>
                {badge.label}
              </Typography>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  container: {
    marginTop: 8,
  },
  contentContainer: {
    paddingRight: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
});
