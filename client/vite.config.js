import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: 'client', plugins: [react()], build: { outDir: 'dist', emptyOutDir: true }, server: { host: '127.0.0.1', port: 5173, proxy: { '/api': 'http://localhost:3001', '/healthz': 'http://localhost:3001', '/readyz': 'http://localhost:3001' } }, test: { environment: 'jsdom', include: ['src/**/*.test.jsx'], setupFiles: ['./src/testSetup.js'], globals: true } });
