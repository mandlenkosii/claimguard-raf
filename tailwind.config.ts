import { claimguardPreset } from './src/theme/preset';

// Loaded by src/theme/index.css through `@config`. All values come from src/theme/tokens.ts.
export default {
  presets: [claimguardPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};
