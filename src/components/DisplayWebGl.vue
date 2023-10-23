<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import * as THREE from 'three'
import { Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'

import { Coordinate } from "../types.ts"
import { Grid } from "../grid.ts"
import { Piece } from  "../puzzle.ts"
import VerticalSlider from "./VerticalSlider.vue"

const props = defineProps<{
    grid: Grid,
    piece: Piece,
}>()

const el = ref()
const viewpoints = props.grid.getViewpoints()
const viewpointId = ref(viewpoints[0].id)
const layerN = ref(0)

const viewpoint = computed(() =>
  viewpoints.find(v => v.id === viewpointId.value)
)

const renderer = new THREE.WebGLRenderer({antialias: true})
const scene = new THREE.Scene()
const fov = 75
const camera = new THREE.PerspectiveCamera(fov, 2, 0.1, 10)
//const camera = new THREE.OrthographicCamera(-5.5, 5.5, -5.5, 5.5)

let controls = new OrbitControls(camera, renderer.domElement)
controls.listenToKeyEvents(window)
controls.addEventListener('change', refresh)

function buildObjects() {
    const objs = []
    for(let coordinate of props.grid.getCoordinates()) {
        const cellInfo = props.grid.getCellInfo(coordinate)
        for(let polygon of Object.values(cellInfo.sidePolygons)) {
            const inLayer = layerHasCoordinate(coordinate)
            const hasPiece = coordinateHasPiece(coordinate)
            let material, geometry, obj

            if(hasPiece) {
                material = new THREE.MeshPhongMaterial({
                    color: inLayer ? 0x00ff00 : 0xffffff,
                    emissive: 0x004400,
                    side: THREE.DoubleSide,
                    transparent: !inLayer,
                    opacity: inLayer ? 1 : 0.1,
                    depthWrite: inLayer,
                })
                geometry = new ConvexGeometry(polygon)
                obj = new THREE.Mesh(geometry, material)

            } else {

                material = new THREE.LineBasicMaterial({
                    color: inLayer ? 0x00ff00 : 0xffffff,
                    transparent: !inLayer,
                    opacity: inLayer ? 1 : 0.1,
                })
                geometry = new THREE.BufferGeometry().setFromPoints(polygon)
                obj = new THREE.LineLoop(geometry, material)
                
                // Draw wireframes of the current layer last so it's not
                // overwritten by other sides of non-selected layers.
                if(inLayer) {
                    obj.renderOrder = 1
                }

            }
            objs.push(obj)
        }
    }
    return objs
}

let firstSceneBuild = true
function doRebuildScene() {
    scene.clear()

    const light1 = new THREE.DirectionalLight(0xffffff, 3)
    light1.position.set(5, 5, 5)
    light1.lookAt(new Vector3(0, 0, 0))
    scene.add(light1)

    const light2 = new THREE.DirectionalLight(0xffffff, 3)
    light2.position.set(-5, -5, -5)
    light2.lookAt(new Vector3(0, 0, 0))
    scene.add(light2)
    
    for(let obj of buildObjects()) {
        scene.add(obj)
    }
    
    if(firstSceneBuild) {
        const boundingBox = new THREE.Box3().setFromObject(scene)  // Calculated _before_ AxisHeper added
        const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere())
        const center = boundingBox.getCenter(new Vector3())

        // Position camera according to the first viewpoint.
        const fovRadians = fov * (Math.PI/180)
        const cameraPosition = viewpoints[0].forwardVector.clone().normalize()
        cameraPosition.multiplyScalar(
            -1 * (boundingSphere.radius * 1.2) / Math.tan(fovRadians / 2)
        )
        cameraPosition.add(center)
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    
        // Center view on the center of the grid.
        // Only do this once on initialization though, since the user can
        // right-click drag to change the OrbitControls target location.
        controls.target = center
        camera.lookAt(center)
    }

    // Add axes helper after bounding box is computed so it doesn't affect the
    // center.
    const axesHelper = new THREE.AxesHelper()
    axesHelper.position.set(-1, -1, -1)
    scene.add(axesHelper)
    
    firstSceneBuild = false
}

watch([viewpoint, layerN], () => {
    refresh(true)
})

function refresh(rebuildScene=false) {
    if(rebuildScene) {
        doRebuildScene()
    }

    if(el.value === null) return
    const width = el.value.offsetWidth
    const height = el.value.offsetHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.render(scene, camera)

    // Calculate camera near/far to fit entire scene
    const boundingBox = new THREE.Box3().setFromObject(scene)  // Calculated _after_ AxisHelper added
    const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere())
    const sphereDistance = boundingSphere.distanceToPoint(camera.position)
    camera.near = Math.max(sphereDistance * .9, 0.1)
    camera.far = (sphereDistance + boundingSphere.radius*2) * 1.1
}

onMounted(() => {
    const resizeObserver = new ResizeObserver(() => refresh())
    resizeObserver.observe(el.value)

    el.value.appendChild(renderer.domElement)
    refresh(true)
})

function layerHasCoordinate(coordinate: Coordinate) {
    let layerCoordinates = props.grid.getViewpointLayer(
        viewpointId.value,
        Number(layerN.value)
    )

    let cordToStr = (cord: Coordinate) => cord.join(",")
    let coordSet: Set<string> = new Set(layerCoordinates.map(cordToStr))
    return coordSet.has(cordToStr(coordinate))
}

function coordinateHasPiece(coordinate: Coordinate) {
    let cordToStr = (cord: Coordinate) => cord.join(",")
    let coordSet: Set<string> = new Set(props.piece.coordinates.map(cordToStr))
    return coordSet.has(cordToStr(coordinate))
}

</script>

<template>
    <div class="display2d" ref="el">
        <div class="controls">
            <select v-model="viewpointId">
                <option
                    v-for="viewpoint in viewpoints"
                    :value="viewpoint.id"
                >
                    {{ viewpoint.name }}
                </option>
            </select>
            <VerticalSlider
                v-if="viewpoint !== undefined && viewpoint.nLayers > 1"
                v-model="layerN"
                :options="[...Array(viewpoint.nLayers).keys()]"
            />
        </div>
    </div>
</template>

<style scoped>
.display2d {
    width: 100%;
    height: 100%;
    position: relative;  /* Make this the containing block for .controls */
}
.controls {
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(255, 255, 255, 0.5);
    border-bottom-right-radius: 10px;
}
</style>
