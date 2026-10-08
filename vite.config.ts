/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // The client only needs fetch, which Node 22 has natively; no DOM required.
    environment: 'node',
  },
});
