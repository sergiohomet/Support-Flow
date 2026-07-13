import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // supabase/functions/ai-triage/triage-logic.ts imports zod via the
      // same esm.sh URL-specifier convention the other Edge Functions use
      // for third-party packages (Deno has no bare-specifier resolution
      // without an import map). Alias it to the local npm package so
      // vitest can resolve it too when unit-testing that pure logic file.
      'https://esm.sh/zod@4.4.3': 'zod',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', '.claude/worktrees/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
})
