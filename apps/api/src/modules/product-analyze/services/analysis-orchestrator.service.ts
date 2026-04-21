import type { AnalysisJobResponse, NormalizedProduct, ProductAnalysisResult } from '@acme/shared';
import { Injectable } from '@nestjs/common';
import type { ScanSource } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  createScan,
  findRecentScanByBarcode,
  prepareScanForAnalysis,
  updateScanAnalysisState,
} from '../repositories/scanRepository';
import { AnalysisPipelineService } from './analysis-pipeline.service';
import { AnalysisGateway } from './analysis.gateway';
import {
  buildAnalysisResponse,
  hasIngredientData,
  parseStoredAnalysisResult,
} from './analysis-state';
import { getAnalysisCacheBoundaryForUser } from './analysis-cache';
import type { ScoreProfileInput } from '../domain/score-engine/compute-score';

interface StartAnalysisInput {
  product: NormalizedProduct;
  productId?: string;
  userId?: string;
  scanSource: ScanSource;
  photoImagePath?: string;
}

interface StartAnalysisResult {
  scanId?: string;
  analysis: AnalysisJobResponse;
}

@Injectable()
export class AnalysisOrchestratorService {
  constructor(
    private readonly analysisPipeline: AnalysisPipelineService,
    private readonly analysisGateway: AnalysisGateway,
  ) {}

  async startAnalysis(input: StartAnalysisInput): Promise<StartAnalysisResult> {
    const cacheBoundary = input.userId ? await getAnalysisCacheBoundaryForUser(input.userId) : null;
    const existingScan =
      input.userId && cacheBoundary
        ? await findRecentScanByBarcode(input.userId, input.product.code, cacheBoundary)
        : null;

    if (
      existingScan &&
      input.scanSource !== 'photo' &&
      existingScan.personalAnalysisStatus === 'completed'
    ) {
      const cachedResult = parseStoredAnalysisResult(existingScan.multiProfileResult);
      if (cachedResult) {
        return {
          scanId: existingScan.id,
          analysis: buildAnalysisResponse({
            analysisId: existingScan.personalAnalysisJobId ?? existingScan.id,
            productStatus: 'completed',
            ingredientsStatus: 'completed',
            result: cachedResult,
          }),
        };
      }
    }

    const analysisId = randomUUID();
    const ingredientStatus = hasIngredientData(input.product) ? 'pending' : 'completed';

    this.analysisGateway.emitProductStarted({
      analysisId,
      productId: input.productId,
      barcode: input.product.code,
      productStatus: 'pending',
      ingredientsStatus: ingredientStatus,
    });

    try {
      const { result, profiles, ingredientAnalyses } =
        await this.analysisPipeline.buildInitialAnalysis(
          input.product,
          input.userId,
          input.productId,
        );

      const scanId = input.userId
        ? await this.persistInitialState({
            existingScanId: existingScan?.id,
            analysisId,
            result,
            userId: input.userId,
            productId: input.productId,
            barcode: input.product.code,
            source: input.scanSource,
            photoImagePath: input.photoImagePath,
            status: ingredientStatus,
          })
        : undefined;

      const analysis = buildAnalysisResponse({
        analysisId,
        productStatus: 'completed',
        ingredientsStatus: ingredientStatus,
        result,
      });

      this.analysisGateway.emitProductCompleted({
        analysisId,
        scanId,
        productId: input.productId,
        barcode: input.product.code,
        productStatus: 'completed',
        ingredientsStatus: ingredientStatus,
        result,
      });

      if (ingredientStatus === 'completed') {
        this.analysisGateway.emitIngredientsCompleted({
          analysisId,
          scanId,
          productId: input.productId,
          barcode: input.product.code,
          productStatus: 'completed',
          ingredientsStatus: 'completed',
          result,
        });

        return { scanId, analysis };
      }

      void this.runIngredientAnalysis({
        analysisId,
        scanId,
        productId: input.productId,
        product: input.product,
        userId: input.userId,
        profiles,
        baseResult: result,
        precomputedIngredientAnalyses: ingredientAnalyses,
      });

      return { scanId, analysis };
    } catch (error) {
      this.analysisGateway.emitProductFailed({
        analysisId,
        productId: input.productId,
        barcode: input.product.code,
        productStatus: 'failed',
        ingredientsStatus: ingredientStatus,
        error: {
          phase: 'product',
          message: 'Product analysis failed',
          code: 'PRODUCT_ANALYSIS_FAILED',
        },
      });

      throw error;
    }
  }

  private async persistInitialState(input: {
    existingScanId?: string;
    analysisId: string;
    result: ProductAnalysisResult;
    userId: string;
    productId?: string;
    barcode: string;
    source: ScanSource;
    photoImagePath?: string;
    status: 'pending' | 'completed';
  }): Promise<string> {
    if (input.existingScanId) {
      const scan = await prepareScanForAnalysis(input.existingScanId, {
        productId: input.productId,
        barcode: input.barcode,
        source: input.source,
        analysisId: input.analysisId,
        personalAnalysisStatus: input.status,
        result: input.result,
        photoImagePath: input.photoImagePath,
      });

      return scan.id;
    }

    const scan = await createScan({
      userId: input.userId,
      productId: input.productId,
      barcode: input.barcode,
      source: input.source,
      analysisId: input.analysisId,
      personalAnalysisStatus: input.status,
      result: input.result,
      photoImagePath: input.photoImagePath,
    });

    return scan.id;
  }

  private async runIngredientAnalysis(input: {
    analysisId: string;
    scanId?: string;
    productId?: string;
    product: NormalizedProduct;
    userId?: string;
    profiles: ScoreProfileInput[];
    baseResult: ProductAnalysisResult;
    precomputedIngredientAnalyses?: Map<string, import('@acme/shared').IngredientAnalysis | null>;
  }): Promise<void> {
    this.analysisGateway.emitIngredientsStarted({
      analysisId: input.analysisId,
      scanId: input.scanId,
      productId: input.productId,
      barcode: input.product.code,
      productStatus: 'completed',
      ingredientsStatus: 'pending',
      result: input.baseResult,
    });

    try {
      const { result, hasAnyIngredientAnalysis } =
        await this.analysisPipeline.buildIngredientEnhancedResult(
          input.product,
          input.baseResult,
          input.profiles,
          input.precomputedIngredientAnalyses,
        );

      if (!hasAnyIngredientAnalysis) {
        if (input.scanId) {
          await updateScanAnalysisState(input.scanId, {
            status: 'failed',
            analysisId: input.analysisId,
          }).catch(() => undefined);
        }

        this.analysisGateway.emitIngredientsFailed({
          analysisId: input.analysisId,
          scanId: input.scanId,
          productId: input.productId,
          barcode: input.product.code,
          productStatus: 'completed',
          ingredientsStatus: 'failed',
          result: input.baseResult,
          error: {
            phase: 'ingredients',
            message: 'Ingredient analysis failed',
            code: 'INGREDIENT_ANALYSIS_FAILED',
          },
        });
        return;
      }

      if (input.scanId) {
        await updateScanAnalysisState(input.scanId, {
          status: 'completed',
          analysisId: input.analysisId,
          result,
        }).catch(() => undefined);
      }

      this.analysisGateway.emitIngredientsCompleted({
        analysisId: input.analysisId,
        scanId: input.scanId,
        productId: input.productId,
        barcode: input.product.code,
        productStatus: 'completed',
        ingredientsStatus: 'completed',
        result,
      });
    } catch (error) {
      console.error('Ingredient analysis background task failed', error);

      if (input.scanId) {
        await updateScanAnalysisState(input.scanId, {
          status: 'failed',
          analysisId: input.analysisId,
        }).catch(() => undefined);
      }

      this.analysisGateway.emitIngredientsFailed({
        analysisId: input.analysisId,
        scanId: input.scanId,
        productId: input.productId,
        barcode: input.product.code,
        productStatus: 'completed',
        ingredientsStatus: 'failed',
        result: input.baseResult,
        error: {
          phase: 'ingredients',
          message: 'Ingredient analysis failed',
          code: 'INGREDIENT_ANALYSIS_FAILED',
        },
      });
    }
  }
}
