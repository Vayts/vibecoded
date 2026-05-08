import { useCallback, useEffect, useRef, useState } from 'react';

interface PendingBarcodeConfirmation {
  barcode: string;
  timestamp: number;
}

interface UseBarcodeConfirmationOptions {
  confirmationWindowMs: number;
}

export const useBarcodeConfirmation = ({
  confirmationWindowMs,
}: UseBarcodeConfirmationOptions) => {
  const pendingRef = useRef<PendingBarcodeConfirmation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

  const clearPendingBarcode = useCallback(() => {
    pendingRef.current = null;
    setPendingBarcode(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setPendingBarcodeConfirmation = useCallback(
    (barcode: string) => {
      pendingRef.current = {
        barcode,
        timestamp: Date.now(),
      };
      setPendingBarcode(barcode);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        pendingRef.current = null;
        timerRef.current = null;
        setPendingBarcode(null);
      }, confirmationWindowMs);
    },
    [confirmationWindowMs],
  );

  const isConfirmedBarcode = useCallback(
    (barcode: string): boolean => {
      const pending = pendingRef.current;
      return Boolean(
        pending &&
          pending.barcode === barcode &&
          Date.now() - pending.timestamp <= confirmationWindowMs,
      );
    },
    [confirmationWindowMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    clearPendingBarcode,
    isConfirmedBarcode,
    pendingBarcode,
    setPendingBarcodeConfirmation,
  };
};

