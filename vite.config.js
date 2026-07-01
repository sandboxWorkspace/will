import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/will/', 
  // publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'), // Alias for root directory
      '@ui': path.resolve(__dirname, './ui'),
      '@utils': path.resolve(__dirname, './utils'),
      '@data': path.resolve(__dirname, './data'),
      '@database': path.resolve(__dirname, './database'),
      '@src': path.resolve(__dirname, './src'),
      '@css': path.resolve(__dirname, './src/css'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        moursund: path.resolve(__dirname, 'moursund.html'),
        v2index: path.resolve(__dirname, 'v2index.html'),
        // Southeast
        seSupply: path.resolve(__dirname, 'southeast-requestSupply.html'),
        seMaintenance: path.resolve(__dirname, 'southeast-requestMaintenance.html'),
        seWishlist: path.resolve(__dirname, 'southeast-requestWishlist.html'),

        // Moursund (unlinked pages — access by direct URL only)
        moSupply: path.resolve(__dirname, 'moursund-requestSupply.html'),
        moMaintenance: path.resolve(__dirname, 'moursund-requestMaintenance.html'),
        moWishlist: path.resolve(__dirname, 'moursund-requestWishlist.html'),

        toolQRGenerator: path.resolve(__dirname, 'toolQRGenerator.html'),
        toolQuickRestock: path.resolve(__dirname, 'toolQuickRestock.html'),
        equipment: path.resolve(__dirname, 'equipment.html'),
        fesBike: path.resolve(__dirname, 'fesBike.html'),
        toolScanMatch: path.resolve(__dirname, 'toolScanMatch.html')
      },
    },
  },
});