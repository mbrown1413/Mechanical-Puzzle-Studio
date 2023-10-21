<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { Vector2, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'

import { Grid } from "../grid.ts"
import { Piece } from  "../puzzle.ts"

const props = defineProps<{
    grid: Grid,
    piece: Piece,
}>()

const el = ref()

const renderer = new THREE.WebGLRenderer({antialias: true})
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 5);
camera.position.set(-2, -2, 2)
//const camera = new THREE.OrthographicCamera(-5.5, 5.5, -5.5, 5.5);

let controls = new OrbitControls(camera, renderer.domElement)
controls.listenToKeyEvents(window)
controls.addEventListener('change', refresh)

const light = new THREE.DirectionalLight(0xffffff, 3)
light.position.set(-5, -5, -5)
light.lookAt(new Vector3(0, 0, 0))
scene.add(light)

const material = new THREE.MeshPhongMaterial({color: 0xffffff, emissive: 0x444444, side: THREE.DoubleSide});

for(let coordinate of props.piece.coordinates) {
    const cellInfo = props.grid.getCellInfo(coordinate)
    for(let polygon of Object.values(cellInfo.sidePolygons)) {
        const geometry = new ConvexGeometry(polygon)
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
    }
}

function refresh() {
    if(el.value === null) return
    const width = el.value.offsetWidth
    const height = el.value.offsetHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.render(scene, camera)
}

onMounted(() => {
    const resizeObserver = new ResizeObserver(refresh)
    resizeObserver.observe(el.value)

    el.value.appendChild(renderer.domElement);
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
