import {defineConfig} from "vite"
import vue from "@vitejs/plugin-vue"
import path from "path"
import vuetify from "vite-plugin-vuetify"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vuetify(),
    ],
    resolve: {
        alias: {
            "~lib": path.resolve(__dirname, "lib/index.ts"),
            "~/lib": path.resolve(__dirname, "lib"),
            "~/ui": path.resolve(__dirname, "ui"),
        }
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    lib: ["lib/index.ts"],
                    vue: ["vue", "vue-router"],
                    vuetify: ["vuetify"],
                    three: ["three"],
                    "misc-vendor": [
                        "split-grid",
                        "colorjs.io",
                    ],
                },
            },
        },
    },
    esbuild: {
        keepNames: true,
    },
})