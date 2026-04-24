export const IS_DEV = process.env.NODE_ENV === 'development';

// ── Generation limits (free tier) ────────────────────────────
export const INITIAL_FREE_GENERATIONS = 5; // credits on sign-up
export const MONTHLY_FREE_GENERATIONS = 3; // credits added each calendar month

// ── Subscription ─────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual',
} as const;

export const ENTITLEMENT_ID = 'pro';
export const MAX_FAMILY_MEMBERS = 5;

export const MIN_TEXT_INPUT_LENGTH = 50;
export const MAX_IMAGE_DIMENSION = 1500;
export const IMAGE_QUALITY = 0.8;

export const GREAT_FIT_SCORE_MIN = 70;
export const GOOD_FIT_SCORE_MIN = 70;
export const NEUTRAL_FIT_SCORE_MIN = 40;

export const FSRS_DEFAULT_PARAMS = {
  requestRetention: 0.9,
  maximumInterval: 36500,
};
