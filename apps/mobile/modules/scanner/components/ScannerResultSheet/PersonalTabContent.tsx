import type { MultiProfilePersonalAnalysisJobResponse, PersonalAnalysisResult } from '@acme/shared';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { mapFitLabelToToneKey, getRatingTone, getFitLabelText } from './evaluationHelpers';
import { EvaluationSection } from './EvaluationSection';
import { IngredientsSection } from './IngredientsSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ScoreSummary } from './ScoreSummary';

interface PersonalTabContentProps {
  personalResult?: MultiProfilePersonalAnalysisJobResponse;
  isError: boolean;
  onRetry: () => void;
}

export function PersonalTabContent({ personalResult, isError, onRetry }: PersonalTabContentProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('you');

  if (personalResult?.status === 'completed' && personalResult.result) {
    const { profiles, detailsByProfile } = personalResult.result;
    const ingredientStatus = personalResult.ingredientAnalysisStatus;
    const hasMultipleProfiles = profiles.length > 1;

    // Ensure selected profile exists, fallback to first
    const activeProfileId =
      detailsByProfile[selectedProfileId] ? selectedProfileId : profiles[0]?.profileId ?? 'you';
    const activeDetail = detailsByProfile[activeProfileId];

    if (!activeDetail) {
      return <PersonalAnalysisFallback onRetry={onRetry} />;
    }

    return (
      <View>
        {hasMultipleProfiles ? (
          <ProfileChips
            profiles={profiles}
            selectedProfileId={activeProfileId}
            onSelect={setSelectedProfileId}
          />
        ) : null}

        <ProfileDetail
          detail={activeDetail}
          profileName={profiles.find((p) => p.profileId === activeProfileId)?.profileName ?? 'You'}
          ingredientStatus={ingredientStatus}
        />
      </View>
    );
  }

  if (personalResult?.status === 'failed' || isError) {
    return <PersonalAnalysisFallback onRetry={onRetry} />;
  }

  return <PersonalAnalysisLoader />;
}

interface ProfileChipsProps {
  profiles: MultiProfilePersonalAnalysisJobResponse['result'] extends infer R
    ? R extends { profiles: infer P }
      ? P
      : never
    : never;
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
            accessibilityLabel={`${profile.profileName}: ${getFitLabelText(profile.fitLabel)}, ${profile.fitScore}/100`}
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
              {profile.profileName}
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
                {profile.fitScore}
              </Typography>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface ProfileDetailProps {
  detail: PersonalAnalysisResult;
  profileName: string;
  ingredientStatus?: string;
}

function ProfileDetail({ detail, profileName, ingredientStatus }: ProfileDetailProps) {
  const forLabel = `For ${profileName.toLowerCase() === 'you' ? 'you' : profileName}`;

  return (
    <View>
      <ScoreSummary
        title="Fit score"
        score={detail.fitScore}
        label={detail.fitLabel}
        toneKey={mapFitLabelToToneKey(detail.fitLabel)}
      />
      {detail.summary ? (
        <View className="mt-4 rounded-xl border border-gray-100 bg-white px-4 py-4">
          <Typography variant="bodySecondary" className="leading-6 text-gray-700">
            {detail.summary}
          </Typography>
        </View>
      ) : null}
      <EvaluationSection title="Positives" items={detail.positives} rightLabel={forLabel} />
      <EvaluationSection title="Negatives" items={detail.negatives} rightLabel={forLabel} />
      {detail.ingredientAnalysis ? (
        <IngredientsSection ingredientAnalysis={detail.ingredientAnalysis} />
      ) : ingredientStatus === 'pending' ? (
        <View className="mt-5 flex-row items-center gap-3 rounded-[12px] border border-gray-100 bg-white px-4 py-4">
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Typography variant="bodySecondary" className="text-gray-500">
            Analyzing ingredients…
          </Typography>
        </View>
      ) : null}
    </View>
  );
}
