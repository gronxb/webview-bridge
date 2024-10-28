import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import {viteHtmlStringify} from 'vite-plugin-html-stringify';

export default defineConfig({
  root: './web',
  plugins: [
    react(),
    viteSingleFile({
      deleteInlinedFiles: true,
      removeViteModuleLoader: true,
    }),
    viteHtmlStringify({
      output: './web/dist.ts',
    }),
  ],
});
