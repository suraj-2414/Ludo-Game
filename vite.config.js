import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // PeerJS purani libraries ke liye "global" dhundhta hai, browser mein wo globalThis hota hai.
  define: { global: 'globalThis' },
});
