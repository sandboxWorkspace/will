import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/will/', // Correct base URL for GitHub Pages deployment

  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, 'assets'), // Set alias for easier asset importing
      '@html': path.resolve(__dirname, ''),
      '@css': path.resolve(__dirname, ''),
      '@js': path.resolve(__dirname, ''),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'), // Draft Main HTML file
        index2: path.resolve(__dirname, 'index2.html'), // Draft Main HTML file
        pending: path.resolve(__dirname, 'pending.html'), // pending HTML file
        fesBike: path.resolve(__dirname, 'fesBike.html'), // fesBike HTML file
        xCite: path.resolve(__dirname, 'xCite.html'), // xCite HTML file
        clinicMap: path.resolve(__dirname, 'clinicMap.html'), // xCite HTML file
        // Add other HTML files if needed
        // other: path.resolve(__dirname, 'other.html'),
      },
    },
  }
});