import { ref, Ref, ComputedRef, onMounted, onUnmounted, watch } from 'vue'

import * as THREE from "three"
import {Vector3} from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {ConvexGeometry} from "three/addons/geometries/ConvexGeometry.js"

import {CellInfo, Coordinate, Viewpoint} from "~lib/types.ts"
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
    renderer.setClearColor(0xdddddd, 1)
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

    function coordinateHasPiece(coordinate: Coordinate): Piece | null {
        if(piece.value === null) return null
        let cordToStr = (cord: Coordinate) => cord.join(",")
        let coordSet: Set<string> = new Set(piece.value.coordinates.map(cordToStr))
        if(coordSet.has(cordToStr(coordinate))) {
            return piece.value
        } else {
            return null
        }
    }
    
    function getLights(): THREE.Light[] {
        const light1 = track(new THREE.DirectionalLight(0xffffff, 3))
        light1.position.set(5, 5, 5)
        light1.lookAt(new Vector3(0, 0, 0))
        scene.add(light1)

        const light2 = track(new THREE.DirectionalLight(0xffffff, 3))
        light2.position.set(-5, -5, -5)
        light2.lookAt(new Vector3(0, 0, 0))
        scene.add(light2)
        
        return [light1, light2]
    }
    
    function initializeCamera() {
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
    
    function getRenderOrder(inLayer: boolean, highlighted: boolean): number {
        if(highlighted) {
            return 2
        } else if(inLayer) {
            return 1
        }
        return 0
    }

    function getCellSolid(
        piece: Piece | null,
        cellInfo: CellInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = track(new THREE.MeshPhongMaterial({
            color: piece ? piece.color : 0xffffff,
            side: THREE.DoubleSide,
            transparent: !inLayer,
            opacity: inLayer ? 1 : 0.5,
            depthWrite: inLayer,
        }))

        const obj = new THREE.Object3D()
        for(let polygon of Object.values(cellInfo.sidePolygons)) {
            const geometry = track(new ConvexGeometry(polygon))
            const mesh = new THREE.Mesh(geometry, material)
            mesh.renderOrder = renderOrder
            obj.add(mesh)
        }
        return obj
    }
    
    function getCellThinWireframe(
        cellInfo: CellInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = track(new THREE.LineBasicMaterial({
            color: highlighted ? 0x0000ff :
                    inLayer ? 0x00ff00 : 0xaaaaaa,
            transparent: !inLayer,
            opacity: inLayer ? 1 : 0.5,
        }))

        const obj = new THREE.Object3D()
        for(let polygon of Object.values(cellInfo.sidePolygons)) {
            const geometry = track(new THREE.BufferGeometry())
            geometry.setFromPoints(polygon)
            const line = new THREE.LineLoop(geometry, material)
            line.renderOrder = renderOrder
            obj.add(line)
        }
        return obj
    }

    function getCellThickWireframe(
        cellInfo: CellInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = track(new THREE.MeshBasicMaterial({
            color: highlighted ? 0x00ff00 : 0x000000,
        }))
        const thickness = 0.005
        const divisions = 10

        const obj = new THREE.Object3D()
        for(let polygon of Object.values(cellInfo.sidePolygons)) {
            for(let i=0; i<polygon.length; i++) {
                const point1 = polygon[i]
                const point2 = polygon[(i+1) % polygon.length]
                const path = new THREE.LineCurve3(
                    new Vector3(...point1),
                    new Vector3(...point2)
                )
                const tubeGeometry = track(
                    new THREE.TubeGeometry(path, 2, thickness, divisions, false)
                )
                const tube = new THREE.Mesh(tubeGeometry, material)
                tube.renderOrder = renderOrder
                obj.add(tube)
                
                const sphereGeometry = track(new THREE.SphereGeometry(thickness, divisions, divisions))
                sphereGeometry.translate(point1.x, point1.y, point1.z)
                const sphere = new THREE.Mesh(sphereGeometry, material)
                sphere.renderOrder = renderOrder
                obj.add(sphere)
            }
        }
        return obj
    }

    function getCellWireframe(
        cellInfo: CellInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        if(inLayer) {
            return getCellThickWireframe(cellInfo, inLayer, highlighted)
        } else {
            return getCellThinWireframe(cellInfo, inLayer, highlighted)
        }
    }

    /* Call rebuild() when the objects in the scene need to be updated. */
    let isInitialRebuild = true
    function rebuild() {
        disposeTrackedResources()
        scene.clear()
        
        getLights().forEach((light) => {
            scene.add(light)
        })
        
        hitTestObjects.value = []
        for(let coordinate of grid.getCoordinates()) {
            const cellInfo = grid.getCellInfo(coordinate)
            const inLayer = layerHasCoordinate(coordinate)
            const pieceAtCoordinate = coordinateHasPiece(coordinate)

            let highlighted = highlightedCoordinate.value !== null &&
                arraysEqual(coordinate, highlightedCoordinate.value)

            const solid = getCellSolid(
                pieceAtCoordinate,
                cellInfo,
                inLayer,
                highlighted,
            )

            if(pieceAtCoordinate) {
                scene.add(solid)
            }

            const wireframe = getCellWireframe(cellInfo, inLayer, highlighted)
            scene.add(wireframe)
            
            if(inLayer) {
                // Populate hitTestObjects and save what coordinate the object
                // was drawn for so we can pull it out later after a raycast
                // intersects it. Since Raycaster will find the leaf nodes of
                // our object tree, we need to set the userData on children.
                solid.children.forEach((child) => {
                    child.userData = {coordinate}
                })
                hitTestObjects.value.push(solid)
            }
        }
        
        if(isInitialRebuild) {
            initializeCamera()
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