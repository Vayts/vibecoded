import React from 'react';
import { SheetDefinition, SheetRegister } from 'react-native-actions-sheet';
import { ScannerResultSheet } from '../../../modules/scanner/components/ScannerResultSheet';
import type { ScannerResultSheetPayload } from '../../../modules/scanner/types/scanner';
import { SheetsEnum } from '../../types/sheets';
import ExampleSheet from './BottomSheets/ExampleSheet';

// We extend some of the types here to give us great intellisense
// across the app for all registered sheets.
declare module 'react-native-actions-sheet' {
  interface Sheets {
    [SheetsEnum.ExampleSheet]: SheetDefinition;
    [SheetsEnum.ScannerResultSheet]: SheetDefinition<{ payload: ScannerResultSheetPayload }>;
  }
}

export const Sheets = () => {
  return (
    <SheetRegister
      sheets={{
        [SheetsEnum.ExampleSheet]: ExampleSheet,
        [SheetsEnum.ScannerResultSheet]: ScannerResultSheet,
      }}
    />
  );
};
