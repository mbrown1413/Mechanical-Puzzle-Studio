import { createApp } from "vue"
import { RouteRecordRaw, createRouter, createWebHistory } from "vue-router"

import App from './App.vue'
import Home from "./pages/Home.vue"
import PuzzleEditor from "./pages/PuzzleEditor.vue"

import './style.scss'

const routes: RouteRecordRaw[] = [
    {
        name: "home",
        path: "/",
        component: Home
    },
    {
        name: "puzzle",
        path: "/puzzle/:storageId/:puzzleId",
        props: true,
        component: PuzzleEditor
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')