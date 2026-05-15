export const getBarcodeScannerStatusMessage = (input: {
  isBarcodePending: boolean;
  isComparePending: boolean;
  isResolvingFirstProduct: boolean;
}): string => {
  if (input.isResolvingFirstProduct) {
    return 'Identifying products…';
  }

  if (input.isBarcodePending) {
    return 'Checking barcode…';
  }

  if (input.isComparePending) {
    return 'Comparing products…';
  }

  return 'Processing…';
};

