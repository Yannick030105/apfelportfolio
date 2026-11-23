/** App-Version. Wird beim Build (und in Vitest) aus package.json eingesetzt, siehe vite.config.ts. */
declare const __APP_VERSION__: string;

export const APP_VERSION: string = __APP_VERSION__;
