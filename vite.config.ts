import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 产物落在 dist/，由流水线 sync 到 s3://<bucket>/web/ 并失效 CDN。
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
