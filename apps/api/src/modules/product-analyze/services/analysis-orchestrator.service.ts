/* eslint-disable max-lines */

import type { AnalysisJobResponse, NormalizedProduct, ProductAnalysisResult } from '@acme/shared';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Injectable } from '@nestjs/common';
import type { ScanSource } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  createScan,
  findScanByAnalysisIdForUser,
  findRecentScanByBarcode,
  prepareScanForAnalysis,
  updateScanAnalysisState,
} from '../repositories/scanRepository';
import { AnalysisPipelineService } from './analysis-pipeline.service';
import { AnalysisGateway } from './analysis.gateway';
import { AnalysisSessionStoreService } from './analysis-session-store.service';
import {
  buildAnalysisResponse,
  buildAnalysisResponseFromStoredState,
  hasIngredientData,
  parseStoredAnalysisResult,
} from './analysis-state';
import { getAnalysisCacheBoundaryForUser } from './analysis-cache';
import type { ScoreProfileInput } from '../domain/score-engine/compute-score';
import { NotFoodProductError } from './not-food-product.error';

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

type IngredientStatus = 'pending' | 'completed';

@Injectable()
export class AnalysisOrchestratorService {
  constructor(
    private readonly analysisPipeline: AnalysisPipelineService,
    private readonly analysisGateway: AnalysisGateway,
    private readonly analysisSessionStore: AnalysisSessionStoreService,
  ) {}

  async startAnalysis(
    input: StartAnalysisInput,
    config?: RunnableConfig<Record<string, unknown>>,
  ): Promise<StartAnalysisResult> {
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

    if (!input.userId) {
      return this.runInlineAnalysis({
        analysisId,
        ingredientStatus,
        input,
        config,
      });
    }

    this.analysisSessionStore.create({
      analysisId,
      userId: input.userId,
      productId: input.productId,
      barcode: input.product.code,
      productStatus: 'pending',
      ingredientsStatus: ingredientStatus,
    });

    void this.runBackgroundAnalysis({
      analysisId,
      ingredientStatus,
      input,
      existingScanId: existingScan?.id,
    });

    return {
      analysis: buildAnalysisResponse({
        analysisId,
        productStatus: 'pending',
        ingredientsStatus: ingredientStatus,
      }),
    };
  }

  async getAnalysisState(
    analysisId: string,
    userId: string,
  ): Promise<AnalysisJobResponse | null> {
    const liveAnalysis = this.analysisSessionStore.findForUser(userId, analysisId);

    if (liveAnalysis) {
      return buildAnalysisResponse({
        analysisId: liveAnalysis.analysisId,
        productStatus: liveAnalysis.productStatus,
        ingredientsStatus: liveAnalysis.ingredientsStatus,
        result: liveAnalysis.result,
        error: liveAnalysis.error,
      });
    }

    const storedScan = await findScanByAnalysisIdForUser(userId, analysisId);

    if (!storedScan) {
      return null;
    }

    const storedState = buildAnalysisResponseFromStoredState({
      analysisId,
      status: storedScan.personalAnalysisStatus,
      result: storedScan.personalResult,
      scanId: storedScan.id,
      productId: storedScan.productId,
      barcode: storedScan.barcode,
    });

    return buildAnalysisResponse({
      analysisId: storedState.analysisId,
      productStatus: storedState.productStatus,
      ingredientsStatus: storedState.ingredientsStatus,
      result: storedState.result,
      error: storedState.error,
    });
  }

  private async runInlineAnalysis(input: {
    analysisId: string;
    ingredientStatus: IngredientStatus;
    input: StartAnalysisInput;
    config?: RunnableConfig<Record<string, unknown>>;
  }): Promise<StartAnalysisResult> {
    const { analysisId, ingredientStatus } = input;

    try {
      const { result, profiles, ingredientAnalyses } =
        await this.analysisPipeline.buildInitialAnalysis(
          input.input.product,
          input.input.userId,
          input.input.productId,
          input.config,
        );

      if (ingredientStatus === 'completed') {
        return {
          analysis: buildAnalysisResponse({
            analysisId,
            productStatus: 'completed',
            ingredientsStatus: 'completed',
            result,
          }),
        };
      }

      const { result: ingredientEnhancedResult, hasAnyIngredientAnalysis } =
        await this.analysisPipeline.buildIngredientEnhancedResult(
          input.input.product,
          result,
          profiles,
          ingredientAnalyses,
        );

      if (!hasAnyIngredientAnalysis) {
        return {
          analysis: buildAnalysisResponse({
            analysisId,
            productStatus: 'completed',
            ingredientsStatus: 'failed',
            result,
            error: {
              phase: 'ingredients',
              message: 'Ingredient analysis failed',
              code: 'INGREDIENT_ANALYSIS_FAILED',
            },
          }),
        };
      }

      return {
        analysis: buildAnalysisResponse({
          analysisId,
          productStatus: 'completed',
          ingredientsStatus: 'completed',
          result: ingredientEnhancedResult,
        }),
      };
    } catch (error) {
      if (error instanceof NotFoodProductError) {
        return {
          analysis: buildAnalysisResponse({
            analysisId,
            productStatus: 'failed',
            ingredientsStatus: ingredientStatus,
            error: {
              phase: 'product',
              message: error.message,
              code: error.code,
            },
          }),
        };
      }

      return {
        analysis: buildAnalysisResponse({
          analysisId,
          productStatus: 'failed',
          ingredientsStatus: ingredientStatus,
          error: {
            phase: 'product',
            message: 'Product analysis failed',
            code: 'PRODUCT_ANALYSIS_FAILED',
          },
        }),
      };
    }
  }

  private async runBackgroundAnalysis(input: {
    analysisId: string;
    ingredientStatus: IngredientStatus;
    input: StartAnalysisInput;
    existingScanId?: string;
  }): Promise<void> {
    this.analysisGateway.emitProductStarted({
      analysisId: input.analysisId,
      productId: input.input.productId,
      barcode: input.input.product.code,
      productStatus: 'pending',
      ingredientsStatus: input.ingredientStatus,
    });

    try {
      const { result, profiles, ingredientAnalyses } =
        await this.analysisPipeline.buildInitialAnalysis(
          input.input.product,
          input.input.userId,
          input.input.productId,
        );

      const scanId = await this.persistScanState({
        existingScanId: input.existingScanId,
        analysisId: input.analysisId,
        userId: input.input.userId!,
        productId: input.input.productId,
        barcode: input.input.product.code,
        source: input.input.scanSource,
        photoImagePath: input.input.photoImagePath,
        status: input.ingredientStatus,
        result,
      });

      this.analysisSessionStore.update({
        analysisId: input.analysisId,
        userId: input.input.userId!,
        scanId,
        productId: input.input.productId,
        barcode: input.input.product.code,
        productStatus: 'completed',
        ingredientsStatus: input.ingredientStatus,
        result,
      });

      this.analysisGateway.emitProductCompleted({
        analysisId: input.analysisId,
        scanId,
        productId: input.input.productId,
        barcode: input.input.product.code,
        productStatus: 'completed',
        ingredientsStatus: input.ingredientStatus,
        result,
      });

      if (input.ingredientStatus === 'completed') {
        this.analysisSessionStore.update({
          analysisId: input.analysisId,
          userId: input.input.userId!,
          scanId,
          productId: input.input.productId,
          barcode: input.input.product.code,
          productStatus: 'completed',
          ingredientsStatus: 'completed',
          result,
        });

        this.analysisGateway.emitIngredientsCompleted({
          analysisId: input.analysisId,
          scanId,
          productId: input.input.productId,
          barcode: input.input.product.code,
          productStatus: 'completed',
          ingredientsStatus: 'completed',
          result,
        });

        return;
      }

      void this.runIngredientAnalysis({
        analysisId: input.analysisId,
        scanId,
        productId: input.input.productId,
        product: input.input.product,
        userId: input.input.userId,
        profiles,
        baseResult: result,
        precomputedIngredientAnalyses: ingredientAnalyses,
      });

      return;
    } catch (error) {
      const isNotFoodError = error instanceof NotFoodProductError;

      if (isNotFoodError) {
        console.warn(
          `[analysis-orchestrator] product marked as NOT_FOOD barcode=${input.input.product.code}`,
        );
      } else {
        console.error('Product analysis background task failed', error);
      }

      const scanId = isNotFoodError
        ? undefined
        : await this.persistScanState({
            existingScanId: input.existingScanId,
            analysisId: input.analysisId,
            userId: input.input.userId!,
            productId: input.input.productId,
            barcode: input.input.product.code,
            source: input.input.scanSource,
            photoImagePath: input.input.photoImagePath,
            status: 'failed',
          }).catch(() => undefined);

      this.analysisSessionStore.update({
        analysisId: input.analysisId,
        userId: input.input.userId!,
        ...(scanId ? { scanId } : {}),
        productId: input.input.productId,
        barcode: input.input.product.code,
        productStatus: 'failed',
        ingredientsStatus: input.ingredientStatus,
        error: {
          phase: 'product',
          message: isNotFoodError ? error.message : 'Product analysis failed',
          code: isNotFoodError ? error.code : 'PRODUCT_ANALYSIS_FAILED',
        },
      });

      this.analysisGateway.emitProductFailed({
        analysisId: input.analysisId,
        scanId,
        productId: input.input.productId,
        barcode: input.input.product.code,
        productStatus: 'failed',
        ingredientsStatus: input.ingredientStatus,
        error: {
          phase: 'product',
          message: isNotFoodError ? error.message : 'Product analysis failed',
          code: isNotFoodError ? error.code : 'PRODUCT_ANALYSIS_FAILED',
        },
      });
    }
  }

  private async persistScanState(input: {
    existingScanId?: string;
    analysisId: string;
    userId: string;
    productId?: string;
    barcode: string;
    source: ScanSource;
    photoImagePath?: string;
    status: 'pending' | 'completed' | 'failed';
    result?: ProductAnalysisResult;
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

        if (input.scanId && input.userId) {
          this.analysisSessionStore.update({
            analysisId: input.analysisId,
            userId: input.userId,
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

      if (input.scanId && input.userId) {
        this.analysisSessionStore.update({
          analysisId: input.analysisId,
          userId: input.userId,
          scanId: input.scanId,
          productId: input.productId,
          barcode: input.product.code,
          productStatus: 'completed',
          ingredientsStatus: 'completed',
          result,
        });
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

      if (input.scanId && input.userId) {
        this.analysisSessionStore.update({
          analysisId: input.analysisId,
          userId: input.userId,
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
