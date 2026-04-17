import { Global, Module } from '@nestjs/common';
import { ProductAnalyzeService } from './product-analyze.service';
import { AnalysisGateway } from './services/analysis.gateway';
import { ScannerLangGraphService } from './services/scanner-langgraph.service';
import { AnalysisOrchestratorService } from './services/analysis-orchestrator.service';
import { AnalysisPipelineService } from './services/analysis-pipeline.service';

@Global()
@Module({
  providers: [
    ProductAnalyzeService,
    ScannerLangGraphService,
    AnalysisPipelineService,
    AnalysisOrchestratorService,
    AnalysisGateway,
  ],
  exports: [ProductAnalyzeService, ScannerLangGraphService],
})
export class ProductAnalyzeModule {}
