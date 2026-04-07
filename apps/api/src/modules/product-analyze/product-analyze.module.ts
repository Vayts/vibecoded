import { Global, Module } from '@nestjs/common';
import { ProductAnalyzeService } from './product-analyze.service';

@Global()
@Module({
  providers: [ProductAnalyzeService],
  exports: [ProductAnalyzeService],
})
export class ProductAnalyzeModule {}
