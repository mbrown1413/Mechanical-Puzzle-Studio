import {createApp} from "vue"
import {RouteRecordRaw, createRouter, createWebHistory} from "vue-router"

import {createVuetify} from "vuetify"
import { mdi } from "vuetify/iconsets/mdi"

import App from "~ui/App.vue"
import Home from "~ui/pages/Home.vue"
import PuzzleEditor from "~ui/pages/PuzzleEditor.vue"

import "~ui/style.scss"
import "@mdi/font/css/materialdesignicons.css"
import "vuetify/styles"

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
app.use(createVuetify({
    icons: {
        defaultSet: "mdi",
        sets: { mdi }
    }
}))
app.mount('#app')