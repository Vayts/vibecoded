import { extractPackageProductDataWithGemini } from './package-photo-extraction-gemini.service.js';
import type {
  PackagePhotoExtractionResult,
  UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import type { PackagePhotoTraceContext } from './package-photo-tracing.util.js';

export async function extractPackageProductData(
  files: UploadedPhotoFileV2[],
  traceContext: PackagePhotoTraceContext,
): Promise<PackagePhotoExtractionResult> {
  return extractPackageProductDataWithGemini(files, traceContext);
}
