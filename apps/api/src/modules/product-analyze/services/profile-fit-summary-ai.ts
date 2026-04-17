import type {
  FitLabel,
  NormalizedProduct,
  OnboardingResponse,
  ProfileProductScore,
} from '@acme/shared';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import { AI_MODELS } from '../constants/models';

export interface ProfileFitSummaryInput {
  onboarding: OnboardingResponse;
  profileScore: ProfileProductScore;
}

type MainGoalValue = NonNullable<OnboardingResponse['mainGoal']>;
type RestrictionValue = OnboardingResponse['restrictions'][number];
type AllergyValue = Exclude<OnboardingResponse['allergies'][number], 'OTHER'>;
type NutritionPriorityValue = OnboardingResponse['nutritionPriorities'][number];

const profileSummaryOutputSchema = z.object({
  profileId: z.string(),
  summary: z.string().nullable(),
});

const summaryBatchOutputSchema = z.object({
  profiles: z.array(profileSummaryOutputSchema),
});

type SummaryBatchOutput = z.infer<typeof summaryBatchOutputSchema>;

interface StructuredSummaryRunner {
  invoke(messages: Array<{ role: string; content: string }>): Promise<SummaryBatchOutput>;
}

interface StructuredSummaryModel {
  withStructuredOutput(schema: typeof summaryBatchOutputSchema): StructuredSummaryRunner;
}

const SUMMARY_OPENINGS: Record<FitLabel, string> = {
  great_fit: 'This product is an excellent fit because',
  good_fit: 'This product is a good fit because',
  neutral: 'This product is a decent fit because',
  poor_fit: 'This product is a poor fit because',
};

const GOAL_LABELS: Record<MainGoalValue, string> = {
  GENERAL_HEALTH: 'general wellbeing',
  WEIGHT_LOSS: 'weight management',
  DIABETES_CONTROL: 'blood sugar balance',
  PREGNANCY: 'pregnancy nutrition',
  MUSCLE_GAIN: 'muscle gain',
};

const RESTRICTION_LABELS: Record<RestrictionValue, string> = {
  VEGAN: 'vegan',
  VEGETARIAN: 'vegetarian',
  KETO: 'keto',
  PALEO: 'paleo',
  GLUTEN_FREE: 'gluten-free',
  DAIRY_FREE: 'dairy-free',
  HALAL: 'halal',
  KOSHER: 'kosher',
  NUT_FREE: 'nut-free',
};

const ALLERGY_LABELS: Record<AllergyValue, string> = {
  PEANUTS: 'peanuts',
  TREE_NUTS: 'tree nuts',
  GLUTEN: 'gluten',
  DAIRY: 'dairy',
  SOY: 'soy',
  EGGS: 'eggs',
  SHELLFISH: 'shellfish',
  SESAME: 'sesame',
};

const PRIORITY_LABELS: Record<NutritionPriorityValue, string> = {
  HIGH_PROTEIN: 'high protein',
  LOW_SUGAR: 'low sugar',
  LOW_SODIUM: 'low sodium',
  LOW_CARB: 'low carb',
  HIGH_FIBER: 'high fiber',
};

const SYSTEM_PROMPT = `You write short, human product fit summaries for a food scanning app.

Rules:
- Return JSON only.
- Return exactly one summary for every provided profileId.
- Use the exact profileId values from the input.
- Each summary must be exactly one sentence.
- Each summary must start with the required opening provided for that profile.
- Keep it concise and natural, around 14 to 28 words.
- Explain the main reasons the product fits or does not fit.
- Use everyday language.
- Never mention AI, analysis, models, scoring systems, or internal labels.
- Never output enum-like text such as GENERAL_HEALTH, LOW_SUGAR, GLUTEN_FREE.
- Do not say the text was generated.
- Prefer specific product reasons over generic wellness advice.`;

const stripTrailingPunctuation = (value: string): string => value.trim().replace(/[.!?]+$/g, '');

const lowerFirst = (value: string): string =>
  value.length > 0 ? value.charAt(0).toLowerCase() + value.slice(1) : value;

const joinReasonFragments = (reasons: string[]): string => {
  if (reasons.length === 0) {
    return '';
  }

  if (reasons.length === 1) {
    return lowerFirst(stripTrailingPunctuation(reasons[0]));
  }

  const normalized = reasons.map((reason) => lowerFirst(stripTrailingPunctuation(reason)));

  return `${normalized.slice(0, -1).join(', ')} and ${normalized[normalized.length - 1]}`;
};

const pickTopReasons = (
  reasons: ProfileProductScore['positives'],
  limit: number,
  kind?: 'positive' | 'neutral',
): string[] => {
  return reasons
    .filter((reason) => (kind ? reason.kind === kind : true))
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
    .slice(0, limit)
    .map((reason) => reason.description);
};

const buildProfileContext = (onboarding: OnboardingResponse): string => {
  const parts: string[] = [];

  if (onboarding.mainGoal) {
    parts.push(`Main goal: ${GOAL_LABELS[onboarding.mainGoal]}`);
  }

  if (onboarding.restrictions.length > 0) {
    parts.push(
      `Dietary preferences: ${onboarding.restrictions.map((restriction) => RESTRICTION_LABELS[restriction]).join(', ')}`,
    );
  }

  const allergies = onboarding.allergies
    .filter((allergy) => allergy !== 'OTHER')
    .map((allergy) => ALLERGY_LABELS[allergy]);
  if (onboarding.otherAllergiesText) {
    allergies.push(onboarding.otherAllergiesText.trim());
  }
  if (allergies.length > 0) {
    parts.push(`Allergies: ${allergies.join(', ')}`);
  }

  if (onboarding.nutritionPriorities.length > 0) {
    parts.push(
      `Nutrition priorities: ${onboarding.nutritionPriorities.map((priority) => PRIORITY_LABELS[priority]).join(', ')}`,
    );
  }

  return parts.length > 0 ? parts.join('\n') : 'No strong dietary preferences provided.';
};

const buildFallbackProfileSummary = (profileScore: ProfileProductScore): string => {
  const opening = SUMMARY_OPENINGS[profileScore.fitLabel];
  const positives = pickTopReasons(profileScore.positives, 2, 'positive');
  const negatives = pickTopReasons(profileScore.negatives, 2);

  if (profileScore.fitLabel === 'poor_fit' && negatives.length > 0) {
    return `${opening} ${joinReasonFragments(negatives)}.`;
  }

  if (profileScore.fitLabel === 'neutral' && positives.length > 0 && negatives.length > 0) {
    return `${opening} ${lowerFirst(stripTrailingPunctuation(positives[0]))}, but ${joinReasonFragments(negatives.slice(0, 1))}.`;
  }

  if (positives.length > 0) {
    return `${opening} ${joinReasonFragments(positives)}.`;
  }

  if (negatives.length > 0) {
    return `${opening} ${joinReasonFragments(negatives)}.`;
  }

  if (profileScore.fitLabel === 'poor_fit') {
    return 'This product is a poor fit because several key nutrition signals clash with your preferences.';
  }

  if (profileScore.fitLabel === 'neutral') {
    return 'This product is a decent fit because it has a mixed nutritional profile with a few trade-offs.';
  }

  return 'This product is a good fit because its overall nutrition profile lines up well with your preferences.';
};

const buildSummaryPromptSection = (input: ProfileFitSummaryInput, index: number): string => {
  const positives = pickTopReasons(input.profileScore.positives, 3, 'positive');
  const neutrals = pickTopReasons(input.profileScore.positives, 2, 'neutral');
  const negatives = pickTopReasons(input.profileScore.negatives, 3);

  return `Profile ${index + 1}:
Profile ID: ${input.profileScore.profileId}
Required opening: ${SUMMARY_OPENINGS[input.profileScore.fitLabel]}

Profile context:
${buildProfileContext(input.onboarding)}

Fit result:
- Label: ${input.profileScore.fitLabel}
- Score: ${input.profileScore.score}/100

Top positives:
${positives.length > 0 ? positives.map((reason) => `- ${stripTrailingPunctuation(reason)}`).join('\n') : '- none'}

Top concerns:
${negatives.length > 0 ? negatives.map((reason) => `- ${stripTrailingPunctuation(reason)}`).join('\n') : '- none'}

Extra context:
${neutrals.length > 0 ? neutrals.map((reason) => `- ${stripTrailingPunctuation(reason)}`).join('\n') : '- none'}`;
};

export async function generateProfileFitSummaries(input: {
  product: NormalizedProduct;
  profiles: ProfileFitSummaryInput[];
}): Promise<Map<string, string>> {
  const fallbackSummaries = new Map(
    input.profiles.map(
      (profile) =>
        [
          profile.profileScore.profileId,
          buildFallbackProfileSummary(profile.profileScore),
        ] as const,
    ),
  );

  if (input.profiles.length === 0 || !process.env.OPENAI_API_KEY) {
    return fallbackSummaries;
  }

  const userPrompt = `Product: ${input.product.product_name ?? 'Unknown product'}
Brand: ${input.product.brands ?? 'Unknown'}

Write one summary for each profile below:

${input.profiles.map((profile, index) => buildSummaryPromptSection(profile, index)).join('\n\n')}`;

  try {
    const model = new ChatOpenAI({
      model: AI_MODELS.reason,
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 1,
      reasoning: { effort: 'low' },
    });

    const structured = (model as unknown as StructuredSummaryModel).withStructuredOutput(
      summaryBatchOutputSchema,
    );
    const raw = await structured.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    const parsed = summaryBatchOutputSchema.parse(raw);
    const summariesByProfileId = new Map(
      parsed.profiles.map((profile) => [profile.profileId, profile.summary?.trim() ?? null]),
    );

    return new Map(
      input.profiles.map((profile) => {
        const fallbackSummary =
          fallbackSummaries.get(profile.profileScore.profileId) ??
          buildFallbackProfileSummary(profile.profileScore);
        const summary = summariesByProfileId.get(profile.profileScore.profileId);

        return [
          profile.profileScore.profileId,
          summary && summary.length > 0 ? summary : fallbackSummary,
        ] as const;
      }),
    );
  } catch (error) {
    console.error('[ProfileFitSummary] Failed:', error);
    return fallbackSummaries;
  }
}

export async function generateProfileFitSummary(input: {
  product: NormalizedProduct;
  onboarding: OnboardingResponse;
  profileScore: ProfileProductScore;
}): Promise<string> {
  const summaries = await generateProfileFitSummaries({
    product: input.product,
    profiles: [
      {
        onboarding: input.onboarding,
        profileScore: input.profileScore,
      },
    ],
  });

  return (
    summaries.get(input.profileScore.profileId) ?? buildFallbackProfileSummary(input.profileScore)
  );
}
