import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { AnalyzeBarcodeV2Response } from '../types/analyze-product-v2.types.js';
import { analyzeBarcodeNode } from './nodes/analyze-barcode.node.js';

export const GraphStateAnnotation = Annotation.Root({
  barcode: Annotation<string>(),
  userId: Annotation<string>(),
  result: Annotation<AnalyzeBarcodeV2Response | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphStateAnnotation.State;

const graph = new StateGraph(GraphStateAnnotation)
  .addNode('analyzeBarcodeNode', analyzeBarcodeNode)
  .addEdge(START, 'analyzeBarcodeNode')
  .addEdge('analyzeBarcodeNode', END);

export const productAnalyzeV2Graph = graph.compile();
