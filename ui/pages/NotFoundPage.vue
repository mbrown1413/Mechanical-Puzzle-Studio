<script setup lang="ts">
import {provide} from "vue"

import TitleBar from "~/ui/components/TitleBar.vue"

provide("actionManager", null)
</script>

<template>
    <TitleBar />
    <VMain style="font-size: 200%;">

        <VRow justify="center" class="mt-5">
            <VCol style="max-width: 800px;">
                <h1>404: Page Not Found</h1>
                <p>
                    The page you're looking has either been moved or doesn't exist.
                </p>
            </VCol>
        </VRow>

        <VRow>
            <VCol style="text-align: center;">
                <VBtn size="x-large" href="/">
                    Return to Home
                </VBtn>
            </VCol>
        </VRow>

    </VMain>
</template>