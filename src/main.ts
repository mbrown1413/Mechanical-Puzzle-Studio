import { createApp } from "vue"
import { RouteRecordRaw, createRouter, createWebHistory } from "vue-router"

import './style.css'
import App from './App.vue'
import Home from "./pages/Home.vue"
import PuzzleEditor from "./pages/PuzzleEditor.vue"

const routes: RouteRecordRaw[] = [
    { path: "/", component: Home },
    { path: "/foo", component: PuzzleEditor },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')