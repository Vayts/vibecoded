import { SheetManager } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../shared/types/sheets';
import type { PackagePhotoExtraction } from '../api/barcodeScannerMutations';

export const usePackagePhotoResultSheet = () => {
  const showPackagePhotoResult = async (
    extraction: PackagePhotoExtraction,
    onDismiss: () => void,
  ) => {
    await SheetManager.show(SheetsEnum.PackagePhotoResultSheet, {
      payload: { extraction, onDismiss },
    });
  };

  return { showPackagePhotoResult };
};

