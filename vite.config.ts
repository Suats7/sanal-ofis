import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 750,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              priority: 40,
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: 'vendor-three-core',
              priority: 30,
              test: /node_modules[\\/]three[\\/]/,
            },
            {
              name: 'vendor-r3f',
              priority: 25,
              test: /node_modules[\\/](@react-three|troika-|three-stdlib|maath|camera-controls|suspend-react|its-fine|react-use-measure|zustand)/,
            },
            {
              name: 'vendor-ai-markdown',
              priority: 20,
              test: /node_modules[\\/](@google[\\/]genai|react-markdown|remark-|rehype-|unified|micromark|mdast-|hast-|unist-|vfile)/,
            },
            {
              name: 'vendor-icons',
              priority: 15,
              test: /node_modules[\\/]lucide-react[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
  },
});
