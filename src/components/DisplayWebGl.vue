<script setup lang="ts">
import { ref, onMounted } from 'vue'

import * as THREE from 'three';

defineProps<{
  grid: object,
}>()

const el = ref()

const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1.5, 1.5, -1.5, 1.5);

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

function refresh() {
    renderer.setSize(el.value.offsetWidth, el.value.offsetHeight);
    renderer.render(scene, camera);
}

/*
function onButtonClick() {
    cube.rotation.x += 0.15;
    cube.rotation.y += 0.15;
    refresh()
}
*/

onMounted(() => {
    const resizeObserver = new ResizeObserver(refresh)
    resizeObserver.observe(el.value)

    el.value.appendChild( renderer.domElement );
    refresh();
})

</script>

<template>
    <div class="display2d" ref="el"></div>
</template>

<style scoped>
.display2d {
    width: 100%;
    height: 100%;
}
</style>
