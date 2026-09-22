// next.config.ts lo resuelve en build (package.json + el commit de Vercel).
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
