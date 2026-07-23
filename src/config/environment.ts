export type UmayEnvironment = 'production' | 'qa' | 'development' | 'test';

function normalizeEnvironment(value?: string): UmayEnvironment {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'qa' || normalized === 'test') return normalized;
  return 'development';
}

export const UMAY_ENVIRONMENT = normalizeEnvironment(
  import.meta.env.VITE_UMAY_ENV || import.meta.env.MODE,
);

export const IS_PRODUCTION = UMAY_ENVIRONMENT === 'production';

// Production keeps the historical keys so an AppDeploy release cannot silently
// create an empty database. Every non-production environment is isolated.
export function environmentServerKey(key: string): string {
  return IS_PRODUCTION ? key : `${UMAY_ENVIRONMENT}:${key}`;
}

export function environmentLocalKey(key: string): string {
  return IS_PRODUCTION ? key : `${key}.${UMAY_ENVIRONMENT}`;
}

