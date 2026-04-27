import { useLocalSearchParams } from 'expo-router';
import { ScannerHomeScreen } from '../../modules/scanner/components/ScannerHomeScreen';
import type { ScannerRouteMode } from '../../modules/scanner/types/scanner';

const getRouteMode = (value: string | string[] | undefined): ScannerRouteMode => {
  const resolvedValue = Array.isArray(value) ? value[0] : value;

  return resolvedValue === 'compare' ? 'compare' : 'default';
};

export default function ScannerIndexScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();

  return <ScannerHomeScreen routeMode={getRouteMode(params.mode)} />;
}
