import React from 'react';
import { SheetDefinition, SheetRegister } from 'react-native-actions-sheet';
import {
  DeleteAccountSheet,
  type DeleteAccountSheetPayload,
} from '../../../modules/profile/components/DeleteAccountSheet';
import { CompareProductPickerSheet } from '../../../modules/scanner/components/CompareProductPickerSheet';
import { ProfileScoreSelectorSheet } from '../../../modules/scanner/components/ProfileScoreSelectorSheet';
import { ScoreCalculationSheet } from '../../../modules/scanner/components/ScoreCalculationSheet';
import {
  ScannerErrorSheet,
  type ScannerErrorSheetPayload,
} from '../../../modules/scanner/components/ScannerErrorSheet';
import { ScannerResultSheet } from '../../../modules/scanner/components/ScannerResultSheet';
import type { ScansFilterSheetPayload } from '../../../modules/scans/types/filters';
import type {
  CompareProductPickerSheetPayload,
  ProfileScoreSelectorSheetPayload,
  ScannerResultSheetPayload,
} from '../../../modules/scanner/types/scanner';
import { SheetsEnum } from '../../types/sheets';
import { ScansFilterSheet } from '../../../modules/scans/components/ScansFilterSheet';
import BasedOnYourProfileSheet from '../../../modules/scanner/components/ScannerResultSheet/BasedOnYourProfileSheet';

// We extend some of the types here to give us great intellisense
// across the app for all registered sheets.
declare module 'react-native-actions-sheet' {
  interface Sheets {
    [SheetsEnum.BasedOnYourProfileSheet]: SheetDefinition<{ payload: { title: string } }>;
    [SheetsEnum.DeleteAccountSheet]: SheetDefinition<{ payload: DeleteAccountSheetPayload }>;
    [SheetsEnum.ScannerResultSheet]: SheetDefinition<{ payload: ScannerResultSheetPayload }>;
    [SheetsEnum.ScoreCalculationSheet]: SheetDefinition;
    [SheetsEnum.CompareProductPickerSheet]: SheetDefinition<{
      payload: CompareProductPickerSheetPayload;
    }>;
    [SheetsEnum.ScannerErrorSheet]: SheetDefinition<{ payload: ScannerErrorSheetPayload }>;
    [SheetsEnum.ScansFilterSheet]: SheetDefinition<{ payload: ScansFilterSheetPayload }>;
    [SheetsEnum.ProfileScoreSelectorSheet]: SheetDefinition<{
      payload: ProfileScoreSelectorSheetPayload;
    }>;
  }
}

export const Sheets = () => {
  return (
    <SheetRegister
      sheets={{
        [SheetsEnum.BasedOnYourProfileSheet]: BasedOnYourProfileSheet,
        [SheetsEnum.DeleteAccountSheet]: DeleteAccountSheet,
        [SheetsEnum.ScannerResultSheet]: ScannerResultSheet,
        [SheetsEnum.CompareProductPickerSheet]: CompareProductPickerSheet,
        [SheetsEnum.ScoreCalculationSheet]: ScoreCalculationSheet,
        [SheetsEnum.ScannerErrorSheet]: ScannerErrorSheet,
        [SheetsEnum.ScansFilterSheet]: ScansFilterSheet,
        [SheetsEnum.ProfileScoreSelectorSheet]: ProfileScoreSelectorSheet,
      }}
    />
  );
};
