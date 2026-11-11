import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function copyMyPcStaticAssets() {
  return {
    name: 'copy-mypc-static-assets',
    closeBundle() {
      for (const target of ['dist', 'docs']) {
        const outDir = path.resolve(__dirname, target);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        for (const file of ['index.html', 'mypc-app.json', 'icon.svg', 'style.css', '.nojekyll', 'CLAUDE.md', 'CREDITS.md', 'README.md']) {
          const src = path.resolve(__dirname, file);
          if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, file));
        }
        for (const dir of ['js', 'levels', 'proof']) {
          const srcDir = path.resolve(__dirname, dir);
          const dstDir = path.join(outDir, dir);
          if (fs.existsSync(srcDir)) {
            fs.cpSync(srcDir, dstDir, { recursive: true });
          }
        }
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyMyPcStaticAssets()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
