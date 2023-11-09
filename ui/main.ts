import {createApp} from "vue"
import {RouteRecordRaw, createRouter, createWebHistory} from "vue-router"

import App from '~ui/App.vue'
import Home from "~ui/pages/Home.vue"
import PuzzleEditor from "~ui/pages/PuzzleEditor.vue"

import '~ui/style.scss'

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