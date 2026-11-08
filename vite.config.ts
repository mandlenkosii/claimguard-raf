import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export const aliases = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@rules': fileURLToPath(new URL('./supabase/functions/_shared/rules', import.meta.url)),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: aliases },
  server: { port: 5173, strictPort: true },
});
