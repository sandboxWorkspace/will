import { defineConfig } from 'vite';
import path from 'path';
import { MaintenanceRequestHandler } from './src/js/requestMaintenance';
import { SupplyRequestHandler } from './src/js/requestSupply.js';
import { WishlistRequestHandler } from './src/js/requestWishlist.js';

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
        v2index: path.resolve(__dirname, 'v2index.html'),
        reqDashboard: path.resolve(__dirname, 'requestDashboard.html'),
        reqMaintenance: path.resolve(__dirname, 'requestMaintenance.html'),
        reqSupplies: path.resolve(__dirname, 'requestSupply.html'),
        reqWishlist: path.resolve(__dirname, 'requestWishlist.html'),
        toolQRGenerator: path.resolve(__dirname, 'toolQRGenerator.html'),
        toolOutcomemeasures: path.resolve(__dirname, 'toolOutcomemeasure.html'),
        internalTimestamp: path.resolve(__dirname, 'internalTimestamp.html'),
        fesBike: path.resolve(__dirname, 'fesBike.html')
      },
    },
  },
});