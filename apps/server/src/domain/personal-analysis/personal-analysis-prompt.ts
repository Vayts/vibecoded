const PROFILE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const getProfileLabel = (index: number): string => PROFILE_LABELS[index] ?? `P${index}`;
