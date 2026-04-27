import type { RunnableConfig } from '@langchain/core/runnables';

interface RunnableConfigOverrides {
  runName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  configurable?: Record<string, unknown>;
}

export const withRunnableConfig = (
  config?: RunnableConfig<Record<string, unknown>>,
  overrides: RunnableConfigOverrides = {},
): RunnableConfig<Record<string, unknown>> => {
  const tags = [...new Set([...(config?.tags ?? []), ...(overrides.tags ?? [])])];
  const metadata = {
    ...(config?.metadata ?? {}),
    ...(overrides.metadata ?? {}),
  };
  const configurable = {
    ...(config?.configurable ?? {}),
    ...(overrides.configurable ?? {}),
  };

  return {
    ...config,
    ...(overrides.runName ? { runName: overrides.runName } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    ...(Object.keys(configurable).length > 0 ? { configurable } : {}),
  };
};
