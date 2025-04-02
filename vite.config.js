import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/will/',
  publicDir: 'public',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'), // Alias for root directory
      '@ui': path.resolve(__dirname, 'ui'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@data': path.resolve(__dirname, 'data'),
      '@database': path.resolve(__dirname, 'database'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        v2index: path.resolve(__dirname, 'src/html/v2index.html'),
        fesBike: path.resolve(__dirname, 'src/html/fesBike.html')
      },
    },
  },
});
