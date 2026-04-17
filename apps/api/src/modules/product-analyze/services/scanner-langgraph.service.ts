import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import type { AnalyzePhotoInput } from '../product-analyze.schemas';
import { ProductAnalyzeService } from '../product-analyze.service';

type BarcodeScanResult = Awaited<ReturnType<ProductAnalyzeService['scanBarcode']>>;
type LookupProductResult = Awaited<ReturnType<ProductAnalyzeService['lookupProduct']>>;
type CompareProductsResult = Awaited<ReturnType<ProductAnalyzeService['compareProducts']>>;
type PhotoOcrResult = Awaited<ReturnType<ProductAnalyzeService['extractPhotoOcr']>>;
type PhotoScanResult = Awaited<ReturnType<ProductAnalyzeService['analyzePhoto']>>;

type FlowConfig<Request> = RunnableConfig<{ flowRequest: Request }>;

type BarcodeScanRequest = { barcode: string; userId?: string };
type LookupProductRequest = { barcode: string };
type CompareProductsRequest = { barcode1: string; barcode2: string; userId: string };
type PhotoOcrRequest = { imageBase64: string };
type PhotoScanRequest = { input: AnalyzePhotoInput };

const createResultChannel = <Result>() =>
  Annotation<Result | null>({
    reducer: (_current, update) => update,
    default: () => null,
  });

const BarcodeScanState = Annotation.Root({
  barcode: Annotation<string>,
  hasUserId: Annotation<boolean>,
  result: createResultChannel<BarcodeScanResult>(),
});

const LookupProductState = Annotation.Root({
  barcode: Annotation<string>,
  result: createResultChannel<LookupProductResult>(),
});

const CompareProductsState = Annotation.Root({
  barcode1: Annotation<string>,
  barcode2: Annotation<string>,
  result: createResultChannel<CompareProductsResult>(),
});

const PhotoOcrState = Annotation.Root({
  result: createResultChannel<PhotoOcrResult>(),
});

const PhotoScanState = Annotation.Root({
  hasOcr: Annotation<boolean>,
  result: createResultChannel<PhotoScanResult>(),
});

@Injectable()
export class ScannerLangGraphService {
  private barcodeScanGraphInstance?: ReturnType<ScannerLangGraphService['createBarcodeScanGraph']>;
  private lookupProductGraphInstance?: ReturnType<
    ScannerLangGraphService['createLookupProductGraph']
  >;
  private compareProductsGraphInstance?: ReturnType<
    ScannerLangGraphService['createCompareProductsGraph']
  >;
  private photoOcrGraphInstance?: ReturnType<ScannerLangGraphService['createPhotoOcrGraph']>;
  private photoScanGraphInstance?: ReturnType<ScannerLangGraphService['createPhotoScanGraph']>;

  constructor(private readonly productAnalyzeService: ProductAnalyzeService) {}

  async scanBarcode(barcode: string, userId?: string): Promise<BarcodeScanResult> {
    const state = await this.barcodeScanGraph.invoke(
      { barcode, hasUserId: Boolean(userId), result: null },
      this.createFlowConfig(
        'scanner.barcode_scan',
        ['scanner', 'barcode_scan', 'langgraph'],
        { barcode, hasUserId: Boolean(userId) },
        { barcode, userId },
      ),
    );

    return this.getResult(state.result, 'scanner.barcode_scan');
  }

  async lookupProduct(barcode: string): Promise<LookupProductResult> {
    const state = await this.lookupProductGraph.invoke(
      { barcode, result: null },
      this.createFlowConfig(
        'scanner.lookup_product',
        ['scanner', 'lookup_product', 'langgraph'],
        { barcode },
        { barcode },
      ),
    );

    return this.getResult(state.result, 'scanner.lookup_product');
  }

  async compareProducts(
    barcode1: string,
    barcode2: string,
    userId: string,
  ): Promise<CompareProductsResult> {
    const state = await this.compareProductsGraph.invoke(
      { barcode1, barcode2, result: null },
      this.createFlowConfig(
        'scanner.compare_products',
        ['scanner', 'compare_products', 'langgraph'],
        { barcode1, barcode2 },
        { barcode1, barcode2, userId },
      ),
    );

    return this.getResult(state.result, 'scanner.compare_products');
  }

  async extractPhotoOcr(imageBase64: string): Promise<PhotoOcrResult> {
    const state = await this.photoOcrGraph.invoke(
      { result: null },
      this.createFlowConfig(
        'scanner.photo_ocr',
        ['scanner', 'photo_ocr', 'langgraph'],
        {},
        { imageBase64 },
      ),
    );

    return this.getResult(state.result, 'scanner.photo_ocr');
  }

  async analyzePhoto(input: AnalyzePhotoInput): Promise<PhotoScanResult> {
    const state = await this.photoScanGraph.invoke(
      { hasOcr: Boolean(input.ocr), result: null },
      this.createFlowConfig(
        'scanner.photo_scan',
        ['scanner', 'photo_scan', 'langgraph'],
        { hasOcr: Boolean(input.ocr) },
        { input },
      ),
    );

    return this.getResult(state.result, 'scanner.photo_scan');
  }

  private createBarcodeScanGraph() {
    return new StateGraph(BarcodeScanState)
      .addNode('scan_barcode', async (_state, config) => {
        const request = this.getFlowRequest<BarcodeScanRequest>(config);
        return {
          result: await this.productAnalyzeService.scanBarcode(request.barcode, request.userId),
        };
      })
      .addEdge(START, 'scan_barcode')
      .addEdge('scan_barcode', END)
      .compile({ name: 'scanner.barcode_scan' });
  }

  private createLookupProductGraph() {
    return new StateGraph(LookupProductState)
      .addNode('lookup_product', async (_state, config) => {
        const request = this.getFlowRequest<LookupProductRequest>(config);
        return { result: await this.productAnalyzeService.lookupProduct(request.barcode) };
      })
      .addEdge(START, 'lookup_product')
      .addEdge('lookup_product', END)
      .compile({ name: 'scanner.lookup_product' });
  }

  private createCompareProductsGraph() {
    return new StateGraph(CompareProductsState)
      .addNode('compare_products', async (_state, config) => {
        const request = this.getFlowRequest<CompareProductsRequest>(config);
        return {
          result: await this.productAnalyzeService.compareProducts(
            request.barcode1,
            request.barcode2,
            request.userId,
          ),
        };
      })
      .addEdge(START, 'compare_products')
      .addEdge('compare_products', END)
      .compile({ name: 'scanner.compare_products' });
  }

  private createPhotoOcrGraph() {
    return new StateGraph(PhotoOcrState)
      .addNode('photo_ocr', async (_state, config) => {
        const request = this.getFlowRequest<PhotoOcrRequest>(config);
        return { result: await this.productAnalyzeService.extractPhotoOcr(request.imageBase64) };
      })
      .addEdge(START, 'photo_ocr')
      .addEdge('photo_ocr', END)
      .compile({ name: 'scanner.photo_ocr' });
  }

  private createPhotoScanGraph() {
    return new StateGraph(PhotoScanState)
      .addNode('photo_scan', async (_state, config) => {
        const request = this.getFlowRequest<PhotoScanRequest>(config);
        return { result: await this.productAnalyzeService.analyzePhoto(request.input) };
      })
      .addEdge(START, 'photo_scan')
      .addEdge('photo_scan', END)
      .compile({ name: 'scanner.photo_scan' });
  }

  private get barcodeScanGraph() {
    return (this.barcodeScanGraphInstance ??= this.createBarcodeScanGraph());
  }

  private get lookupProductGraph() {
    return (this.lookupProductGraphInstance ??= this.createLookupProductGraph());
  }

  private get compareProductsGraph() {
    return (this.compareProductsGraphInstance ??= this.createCompareProductsGraph());
  }

  private get photoOcrGraph() {
    return (this.photoOcrGraphInstance ??= this.createPhotoOcrGraph());
  }

  private get photoScanGraph() {
    return (this.photoScanGraphInstance ??= this.createPhotoScanGraph());
  }

  private createFlowConfig<Request>(
    runName: string,
    tags: string[],
    metadata: Record<string, unknown>,
    flowRequest: Request,
  ): FlowConfig<Request> {
    return {
      runName,
      tags,
      metadata,
      configurable: { flowRequest },
    };
  }

  private getFlowRequest<Request>(
    config?: RunnableConfig<Record<string, unknown>> | Record<string, unknown>,
  ): Request {
    const flowRequest =
      config && 'configurable' in config
        ? (config as FlowConfig<Request>).configurable?.flowRequest
        : undefined;

    if (typeof flowRequest === 'undefined') {
      throw new Error('LangGraph flow request payload is missing');
    }

    return flowRequest;
  }

  private getResult<Result>(result: Result | null, flowName: string): Result {
    if (result === null) {
      throw new Error(`LangGraph flow ${flowName} completed without a result`);
    }

    return result;
  }
}
