import { NUTRI_SCORE_BLOCK_ESTIMATED_HEIGHT, isNutriScoreGrade } from './NutriScoreBlock';
import { PREVIEW_SUMMARY_ESTIMATED_HEIGHT } from './PreviewSummaryContent';
import { PRODUCT_RESULT_HEADER_ESTIMATED_HEIGHT } from './ProductResultHeader';

const DEFAULT_PREVIEW_SNAP_POINT = 32;
const MIN_PREVIEW_SNAP_POINT = 6;
const MAX_PREVIEW_SNAP_POINT = 95;
const PREVIEW_CONTENT_BOTTOM_PADDING = 32;
const SHEET_HANDLE_ALLOWANCE = 28;

interface PreviewSnapPointParams {
  windowHeight: number;
  hasPreviewState: boolean;
  hasSummaryContent: boolean;
  nutriScoreGrade?: string | null;
}

export function getPreviewSnapPoint({
  windowHeight,
  hasPreviewState,
  hasSummaryContent,
  nutriScoreGrade,
}: PreviewSnapPointParams): number {
  if (!hasPreviewState || windowHeight <= 0) {
    return DEFAULT_PREVIEW_SNAP_POINT;
  }

  const previewHeight =
    PRODUCT_RESULT_HEADER_ESTIMATED_HEIGHT +
    PREVIEW_CONTENT_BOTTOM_PADDING +
    (isNutriScoreGrade(nutriScoreGrade) ? NUTRI_SCORE_BLOCK_ESTIMATED_HEIGHT : 0) +
    (hasSummaryContent ? PREVIEW_SUMMARY_ESTIMATED_HEIGHT : 0);
  const previewPercentage = Math.ceil(
    ((previewHeight + SHEET_HANDLE_ALLOWANCE) / windowHeight) * 100,
  );

  return Math.min(Math.max(previewPercentage, MIN_PREVIEW_SNAP_POINT), MAX_PREVIEW_SNAP_POINT);
}