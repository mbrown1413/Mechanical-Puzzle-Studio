import {createApp} from "vue"
import {RouteRecordRaw, createRouter, createWebHistory} from "vue-router"

import {createVuetify} from "vuetify"
import {mdi} from "vuetify/iconsets/mdi"

import App from "~/ui/App.vue"
import HomePage from "~/ui/pages/HomePage.vue"
import EditPuzzlePage from "~/ui/pages/EditPuzzlePage.vue"
import NotFoundPage from "~/ui/pages/NotFoundPage.vue"
import {clearStorageCache} from "~/ui/storage.ts"

import "~/ui/style.scss"
import "@mdi/font/css/materialdesignicons.css"
import "vuetify/styles"

const routes: RouteRecordRaw[] = [
    {
        name: "home",
        path: "/",
        component: HomePage
    },
    {
        name: "puzzle",
        path: "/puzzle/:storageId/:puzzleName",
        props: true,
        component: EditPuzzlePage
    },
    {
        name: 'notFound',
        path: '/:pathMatch(.*)*',
        component: NotFoundPage
    },
]

const router = createRouter({
    history: createWebHistory(
        import.meta.env.BASE_URL,
    ),
    routes,
})

router.afterEach(clearStorageCache)

const app = createApp(App)
app.use(router)
app.use(createVuetify({
    icons: {
        defaultSet: "mdi",
        sets: { mdi }
    }
}))
app.mount('#app')