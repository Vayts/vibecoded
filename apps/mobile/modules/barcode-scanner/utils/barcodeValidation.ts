export type SupportedScannerBarcodeType =
  | 'ean13'
  | 'ean8'
  | 'upc_a'
  | 'upc_e'
  | 'code128'
  | 'code39';

export type BarcodeValidationFailureReason =
  | 'UNSUPPORTED_TYPE'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_LENGTH'
  | 'INVALID_CHECKSUM';

export type BarcodeValidationResult =
  | {
      isValid: true;
      normalizedBarcode: string;
    }
  | {
      isValid: false;
      reason: BarcodeValidationFailureReason;
      message: string;
    };

const GENERIC_INVALID_BARCODE_MESSAGE = 'This barcode looks invalid. Try scanning again.';
const UNSUPPORTED_BARCODE_MESSAGE = 'Only standard product barcodes are supported.';
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

const isSupportedScannerBarcodeType = (value: string): value is SupportedScannerBarcodeType => {
  return (
    value === 'ean13' ||
    value === 'ean8' ||
    value === 'upc_a' ||
    value === 'upc_e' ||
    value === 'code128' ||
    value === 'code39'
  );
};

export const normalizeScannedBarcode = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.startsWith('*') && trimmed.endsWith('*') && trimmed.length > 2) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const calculateGtinCheckDigit = (payloadDigits: string): number => {
  const sum = payloadDigits
    .split('')
    .reverse()
    .reduce((accumulator, digit, index) => {
      const multiplier = index % 2 === 0 ? 3 : 1;
      return accumulator + Number(digit) * multiplier;
    }, 0);

  return (10 - (sum % 10)) % 10;
};

const isValidGtin = (digits: string): boolean => {
  if (!/^\d+$/.test(digits) || !GTIN_LENGTHS.has(digits.length)) {
    return false;
  }

  const payload = digits.slice(0, -1);
  const expectedCheckDigit = calculateGtinCheckDigit(payload);
  return expectedCheckDigit === Number(digits[digits.length - 1]);
};

const expandUpceToUpca = (digits: string): string | null => {
  if (!/^\d{8}$/.test(digits)) {
    return null;
  }

  const [numberSystem, d1, d2, d3, d4, d5, d6, checkDigit] = digits.split('');

  if (numberSystem !== '0' && numberSystem !== '1') {
    return null;
  }

  switch (d6) {
    case '0':
    case '1':
    case '2':
      return `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}${checkDigit}`;
    case '3':
      return `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}${checkDigit}`;
    case '4':
      return `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}${checkDigit}`;
    default:
      return `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}${checkDigit}`;
  }
};

const isValidUpce = (digits: string): boolean => {
  const upca = expandUpceToUpca(digits);
  return upca ? isValidGtin(upca) : false;
};

const invalid = (
  reason: BarcodeValidationFailureReason,
  message: string,
): BarcodeValidationResult => ({
  isValid: false,
  reason,
  message,
});

export const validateScannedBarcode = (input: {
  barcode: string;
  type: string;
}): BarcodeValidationResult => {
  const normalizedBarcode = normalizeScannedBarcode(input.barcode);

  if (!normalizedBarcode) {
    return invalid('INVALID_LENGTH', GENERIC_INVALID_BARCODE_MESSAGE);
  }

  if (!isSupportedScannerBarcodeType(input.type)) {
    return invalid('UNSUPPORTED_TYPE', UNSUPPORTED_BARCODE_MESSAGE);
  }

  if (!/^\d+$/.test(normalizedBarcode)) {
    return invalid('UNSUPPORTED_FORMAT', UNSUPPORTED_BARCODE_MESSAGE);
  }

  switch (input.type) {
    case 'ean13':
      if (normalizedBarcode.length !== 12 && normalizedBarcode.length !== 13) {
        return invalid('INVALID_LENGTH', GENERIC_INVALID_BARCODE_MESSAGE);
      }
      return isValidGtin(normalizedBarcode)
        ? { isValid: true, normalizedBarcode }
        : invalid('INVALID_CHECKSUM', GENERIC_INVALID_BARCODE_MESSAGE);
    case 'ean8':
      if (normalizedBarcode.length !== 8) {
        return invalid('INVALID_LENGTH', GENERIC_INVALID_BARCODE_MESSAGE);
      }
      return isValidGtin(normalizedBarcode)
        ? { isValid: true, normalizedBarcode }
        : invalid('INVALID_CHECKSUM', GENERIC_INVALID_BARCODE_MESSAGE);
    case 'upc_a':
      if (normalizedBarcode.length !== 12) {
        return invalid('INVALID_LENGTH', GENERIC_INVALID_BARCODE_MESSAGE);
      }
      return isValidGtin(normalizedBarcode)
        ? { isValid: true, normalizedBarcode }
        : invalid('INVALID_CHECKSUM', GENERIC_INVALID_BARCODE_MESSAGE);
    case 'upc_e':
      if (normalizedBarcode.length !== 8) {
        return invalid('INVALID_LENGTH', GENERIC_INVALID_BARCODE_MESSAGE);
      }
      return isValidUpce(normalizedBarcode)
        ? { isValid: true, normalizedBarcode }
        : invalid('INVALID_CHECKSUM', GENERIC_INVALID_BARCODE_MESSAGE);
    case 'code128':
    case 'code39':
      if (!GTIN_LENGTHS.has(normalizedBarcode.length)) {
        return invalid('INVALID_LENGTH', UNSUPPORTED_BARCODE_MESSAGE);
      }

      if (normalizedBarcode.length === 8) {
        const isValidEightDigitBarcode =
          isValidGtin(normalizedBarcode) || isValidUpce(normalizedBarcode);

        return isValidEightDigitBarcode
          ? { isValid: true, normalizedBarcode }
          : invalid('INVALID_CHECKSUM', GENERIC_INVALID_BARCODE_MESSAGE);
      }

      return isValidGtin(normalizedBarcode)
        ? { isValid: true, normalizedBarcode }
        : invalid('INVALID_CHECKSUM', GENERIC_INVALID_BARCODE_MESSAGE);
  }
};

