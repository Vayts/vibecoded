import React from 'react';
import { SheetDefinition, SheetRegister } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../types/sheets';
import ExampleSheet from './BottomSheets/ExampleSheet';

// We extend some of the types here to give us great intellisense
// across the app for all registered sheets.
declare module 'react-native-actions-sheet' {
  interface Sheets {
    [SheetsEnum.ExampleSheet]: SheetDefinition;
  }
}

export const Sheets = () => {
  return (
    <SheetRegister
      sheets={{
        [SheetsEnum.ExampleSheet]: ExampleSheet,
      }}
    />
  );
};
