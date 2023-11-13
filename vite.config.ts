import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "~bootstrap": path.resolve(__dirname, "node_modules/bootstrap"),
            "~lib": path.resolve(__dirname, "lib"),
            "~ui": path.resolve(__dirname, "ui"),
        }
    },
    build: {
        sourcemap: true,
    },
    esbuild: {
        keepNames: true,
    },
})
