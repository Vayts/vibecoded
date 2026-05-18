import { Logger } from '@nestjs/common';

export const createProductAnalyzeV2Logger = (context: string): Logger => {
  return new Logger(`ProductAnalyzeV2:${context}`);
};

export const formatLogContext = (context: Record<string, unknown>): string => {
  try {
    return JSON.stringify(context);
  } catch {
    return '{}';
  }
};

export const getErrorStack = (error: unknown): string | undefined => {
  return error instanceof Error ? error.stack : undefined;
};
