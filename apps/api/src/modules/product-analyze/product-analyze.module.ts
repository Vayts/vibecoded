import { Global, Module } from '@nestjs/common';
import { ProductAnalyzeService } from './product-analyze.service';
import { AnalysisGateway } from './services/analysis.gateway';
import { AnalysisOrchestratorService } from './services/analysis-orchestrator.service';
import { AnalysisPipelineService } from './services/analysis-pipeline.service';
import { AnalysisSessionStoreService } from './services/analysis-session-store.service';

@Global()
@Module({
  providers: [
    ProductAnalyzeService,
    AnalysisPipelineService,
    AnalysisOrchestratorService,
    AnalysisSessionStoreService,
    AnalysisGateway,
  ],
  exports: [ProductAnalyzeService],
})
export class ProductAnalyzeModule {}
