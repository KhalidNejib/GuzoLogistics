import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // 1. Add this import back
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(), // 2. Add this plugin back
    ],
    envDir: '../../',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
