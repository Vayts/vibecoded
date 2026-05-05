import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { AnalyzeBarcodeV2Response } from '../types/analyze-product-v2.types.js';
import {
  analyzeBarcodeNode,
  type AnalyzedProductByBarcodeResult,
} from './nodes/analyze-barcode.node.js';
import { compareProductsNode } from './nodes/compare-products.node.js';

export const GraphStateAnnotation = Annotation.Root({
  barcode: Annotation<string>(),
  userId: Annotation<string>(),
  result: Annotation<AnalyzeBarcodeV2Response | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  analyzedProduct: Annotation<AnalyzedProductByBarcodeResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export const CompareGraphStateAnnotation = Annotation.Root({
  barcodeA: Annotation<string>(),
  barcodeB: Annotation<string>(),
  userId: Annotation<string>(),
  products: Annotation<AnalyzedProductByBarcodeResult[] | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

const graph = new StateGraph(GraphStateAnnotation)
  .addNode('analyzeBarcodeNode', analyzeBarcodeNode)
  .addEdge(START, 'analyzeBarcodeNode')
  .addEdge('analyzeBarcodeNode', END);

export const productAnalyzeV2Graph = graph.compile();

const compareGraph = new StateGraph(CompareGraphStateAnnotation)
  .addNode('compareProductsNode', compareProductsNode)
  .addEdge(START, 'compareProductsNode')
  .addEdge('compareProductsNode', END);

export const productAnalyzeV2CompareGraph = compareGraph.compile();
