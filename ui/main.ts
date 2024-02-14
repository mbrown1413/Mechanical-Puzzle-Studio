import {createApp} from "vue"
import {RouteRecordRaw, createRouter, createWebHistory} from "vue-router"

import {createVuetify} from "vuetify"
import {mdi} from "vuetify/iconsets/mdi"

import App from "~/ui/App.vue"
import Home from "~/ui/pages/Home.vue"
import EditPuzzle from "~/ui/pages/EditPuzzle.vue"

import "~/ui/style.scss"
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
        path: "/puzzle/:storageId/:puzzleName",
        props: true,
        component: EditPuzzle
    },
]

const router = createRouter({
    history: createWebHistory(
        import.meta.env.BASE_URL,
    ),
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