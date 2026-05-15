import { useLocalSearchParams } from 'expo-router';
import { BarcodeScannerPage } from '../../modules/barcode-scanner/pages/BarcodeScannerPage';
import type { BarcodeScannerRouteMode } from '../../modules/barcode-scanner/types/barcodeScanner';

const getRouteMode = (value: string | string[] | undefined): BarcodeScannerRouteMode => {
  const resolvedValue = Array.isArray(value) ? value[0] : value;

  return resolvedValue === 'compare' ? 'compare' : 'default';
};

export default function ScannerIndexScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();

  return <BarcodeScannerPage routeMode={getRouteMode(params.mode)} />;
}
