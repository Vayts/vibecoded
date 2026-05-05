import {
  getOrAnalyzeProductByBarcode,
  type AnalyzedProductByBarcodeResult,
} from './analyze-barcode.node.js';

interface CompareProductsNodeState {
  barcodeA: string;
  barcodeB: string;
  userId: string;
}

export async function compareProductsNode(
  state: CompareProductsNodeState,
): Promise<{ products: AnalyzedProductByBarcodeResult[] }> {
  const [productA, productB] = await Promise.all([
    getOrAnalyzeProductByBarcode({ barcode: state.barcodeA, userId: state.userId }),
    getOrAnalyzeProductByBarcode({ barcode: state.barcodeB, userId: state.userId }),
  ]);

  return {
    products: [productA, productB],
  };
}
