import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 产物落在 dist/，由流水线 sync 到 s3://<bucket>/web/ 并失效 CDN。
// CDN 的 viewer-request 白名单只放行 /web/* 与 /users/*/assets/public/*，
// 无扩展名路径才 rewrite 到 /web/index.html —— 所以产物必须挂在 /web/ 下。
export default defineConfig({
  plugins: [react()],
  base: '/web/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
