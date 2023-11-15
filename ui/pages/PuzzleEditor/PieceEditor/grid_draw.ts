import { ref, Ref, ComputedRef, onMounted, onUnmounted, watch } from 'vue'

import * as THREE from "three"
import {Vector3} from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {ConvexGeometry} from "three/addons/geometries/ConvexGeometry.js"

import {Coordinate, Viewpoint} from "~lib/types.ts"
import {arraysEqual} from "~lib/tools.ts"
import {Grid} from "~lib/Grid.ts"
import {Piece} from  "~lib/Puzzle.ts"

export function useGridDrawComposible(
    element: Ref<HTMLElement>,
    grid: Grid,
    piece: ComputedRef<Piece | null>,
    layerN: Ref<number>,
    viewpoint: ComputedRef<Viewpoint>,
    highlightedCoordinate: Ref<Coordinate | null>,
) {
    const renderer = new THREE.WebGLRenderer({antialias: true})
    const scene = new THREE.Scene()
    const fov = 75
    const camera = new THREE.PerspectiveCamera(fov, 2, 0.1, 10)
    let controls = new OrbitControls(camera, renderer.domElement)
    const hitTestObjects: Ref<THREE.Object3D[]> = ref([])
    
    controls.listenToKeyEvents(window)
    controls.addEventListener('change', refresh)

    watch([piece, viewpoint, layerN, highlightedCoordinate], () => {
        rebuild()
        refresh()
    })

    onMounted(() => {
        const resizeObserver = new ResizeObserver(() => refresh())
        resizeObserver.observe(element.value)

        element.value.appendChild(renderer.domElement)
        rebuild()
        refresh()
    })
    
    onUnmounted(() => {
        disposeTrackedResources()
        controls.dispose()
        renderer.dispose()
    })

    /* Call this when things like camera and window size change. */
    function refresh(
    ) {

        if(element.value === null) return
        const width = element.value.offsetWidth
        const height = element.value.offsetHeight
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

    /* Call this when the objects in the scene need to be updated. */
    let isInitialRebuild = true
    function rebuild() {
        disposeTrackedResources()
        scene.clear()
        
        function layerHasCoordinate(coordinate: Coordinate) {
            if(!viewpoint.value) return false
            let layerCoordinates = grid.getViewpointLayer(
                viewpoint.value.id,
                Number(layerN.value)
            )

            let cordToStr = (cord: Coordinate) => cord.join(",")
            let coordSet: Set<string> = new Set(layerCoordinates.map(cordToStr))
            return coordSet.has(cordToStr(coordinate))
        }

        function coordinateHasPiece(coordinate: Coordinate) {
            if(piece.value === null) return false
            let cordToStr = (cord: Coordinate) => cord.join(",")
            let coordSet: Set<string> = new Set(piece.value.coordinates.map(cordToStr))
            return coordSet.has(cordToStr(coordinate))
        }

        const light1 = track(new THREE.DirectionalLight(0xffffff, 3))
        light1.position.set(5, 5, 5)
        light1.lookAt(new Vector3(0, 0, 0))
        scene.add(light1)

        const light2 = track(new THREE.DirectionalLight(0xffffff, 3))
        light2.position.set(-5, -5, -5)
        light2.lookAt(new Vector3(0, 0, 0))
        scene.add(light2)
        
        hitTestObjects.value = []
        for(let coordinate of grid.getCoordinates()) {
            const cellInfo = grid.getCellInfo(coordinate)
            
            let highlighted = false
            if(highlightedCoordinate.value !== null && arraysEqual(coordinate, highlightedCoordinate.value)) {
                highlighted = true
            }

            for(let polygon of Object.values(cellInfo.sidePolygons)) {
                const inLayer = layerHasCoordinate(coordinate)
                const hasPiece = coordinateHasPiece(coordinate)
                let material, geometry, obj

                if(hasPiece) {
                    material = new THREE.MeshPhongMaterial({
                        color: highlighted ? 0x0000ff : 
                                inLayer ? 0x00ff00 : 0xffffff,
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
                        color: highlighted ? 0x0000ff :
                                inLayer ? 0x00ff00 : 0xffffff,
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
                    // Draw highlighted cells even later
                    if(highlighted) {
                        obj.renderOrder = 2
                    }

                }
                track(material)
                track(geometry)
                scene.add(obj)
                
                // Build separate objects for raycast intersection tests.
                // We could re-use some objects, but we can't do intersections
                // properly with lines.
                if(inLayer) {
                    const geometry = track(new ConvexGeometry(polygon))
                    const obj = new THREE.Mesh(geometry)
                    obj.userData = {coordinate}
                    hitTestObjects.value.push(obj)
                }

            }
            
        }
        
        if(isInitialRebuild) {
            const boundingBox = new THREE.Box3().setFromObject(scene)  // Calculated _before_ AxisHeper added
            const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere())
            const center = boundingBox.getCenter(new Vector3())

            // Position camera according to the initial viewpoint.
            const fovRadians = fov * (Math.PI/180)
            const cameraPosition = viewpoint.value.forwardVector.clone().normalize()
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

        isInitialRebuild = false
    }

    ////////// Resource Tracking //////////
    // Textures, geometries, and materials must have `.dispose()` called in order
    // for their memory to be free'd. See:
    //
    //     https://threejs.org/manual/#en/cleanup
    //
    // Here, we have a simple system that starts tracking when you call
    // `track(resource)`, then frees everything tracked `disposeTrackedResources()`
    // is called.
    interface Disposible {
        dispose: () => void
    }
    let trackedResources: Disposible[] = []
    function track<Type extends Disposible>(resource: Type): Type {
        trackedResources.push(resource)
        return resource
    }
    function disposeTrackedResources() {
        for(const resource of trackedResources) {
            resource.dispose()
        }
        trackedResources = []
    }

    return {
        renderer,
        scene,
        camera,
        hitTestObjects,
        rebuildScene: () => {rebuild(); refresh()},
    }
}