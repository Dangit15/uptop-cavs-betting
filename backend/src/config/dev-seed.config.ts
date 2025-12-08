export const isDevSeedEnabled = (): boolean =>
  process.env.DEV_SEED_ENABLED === 'true';
