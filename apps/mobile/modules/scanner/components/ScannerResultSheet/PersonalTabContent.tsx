import type { AnalysisJobResponse, ProfileProductScore } from '@acme/shared';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { mapFitLabelToToneKey, getRatingTone, getFitLabelText } from './evaluationHelpers';
import { EvaluationSection } from './EvaluationSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ScoreSummary } from './ScoreSummary';

interface PersonalTabContentProps {
  personalResult?: AnalysisJobResponse;
  isError: boolean;
  onRetry: () => void;
}

export function PersonalTabContent({ personalResult, isError, onRetry }: PersonalTabContentProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('you');

  if (personalResult?.status === 'completed' && personalResult.result) {
    const { profiles } = personalResult.result;
    const hasMultipleProfiles = profiles.length > 1;

    // Ensure selected profile exists, fallback to first
    const activeProfile =
      profiles.find((p) => p.profileId === selectedProfileId) ?? profiles[0];

    if (!activeProfile) {
      return <PersonalAnalysisFallback onRetry={onRetry} />;
    }

    return (
      <View>
        {hasMultipleProfiles ? (
          <ProfileChips
            profiles={profiles}
            selectedProfileId={activeProfile.profileId}
            onSelect={setSelectedProfileId}
          />
        ) : null}

        <ProfileDetail profile={activeProfile} />
      </View>
    );
  }

  if (personalResult?.status === 'failed' || isError) {
    return <PersonalAnalysisFallback onRetry={onRetry} />;
  }

  return <PersonalAnalysisLoader />;
}

interface ProfileChipsProps {
  profiles: ProfileProductScore[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
}

function ProfileChips({ profiles, selectedProfileId, onSelect }: ProfileChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
      contentContainerStyle={{ gap: 8 }}
    >
      {profiles.map((profile) => {
        const isSelected = profile.profileId === selectedProfileId;
        const toneKey = mapFitLabelToToneKey(profile.fitLabel);
        const tone = getRatingTone(toneKey);

        return (
          <TouchableOpacity
            key={profile.profileId}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${profile.name}: ${getFitLabelText(profile.fitLabel)}, ${profile.score}/100`}
            className="min-h-[44px] flex-row items-center rounded-full border px-4 py-2"
            style={{
              borderColor: isSelected ? tone.borderColor : COLORS.gray200,
              backgroundColor: isSelected ? tone.backgroundColor : COLORS.white,
            }}
            onPress={() => {
              onSelect(profile.profileId);
            }}
          >
            <Typography
              variant="buttonSmall"
              style={{ color: isSelected ? tone.textColor : COLORS.gray700 }}
            >
              {profile.name}
            </Typography>
            <View
              className="ml-2 rounded-full px-2 py-0.5"
              style={{ backgroundColor: isSelected ? tone.badgeColor : COLORS.gray200 }}
            >
              <Typography
                variant="caption"
                className="font-semibold"
                style={{ color: isSelected ? COLORS.white : COLORS.gray700 }}
              >
                {profile.score}
              </Typography>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface ProfileDetailProps {
  profile: ProfileProductScore;
}

function ProfileDetail({ profile }: ProfileDetailProps) {
  const forLabel = `For ${profile.name.toLowerCase() === 'you' ? 'you' : profile.name}`;

  return (
    <View>
      <ScoreSummary
        title="Fit score"
        score={profile.score}
        label={profile.fitLabel}
        toneKey={mapFitLabelToToneKey(profile.fitLabel)}
      />
      <EvaluationSection title="Positives" items={profile.positives} rightLabel={forLabel} />
      <EvaluationSection title="Negatives" items={profile.negatives} rightLabel={forLabel} />
    </View>
  );
}
