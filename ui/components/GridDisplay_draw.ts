import {ref, Ref, ComputedRef, onMounted, onUnmounted, computed, watchEffect} from "vue"

import * as THREE from "three"
import {Vector3} from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {ConvexGeometry} from "three/addons/geometries/ConvexGeometry.js"

import {VoxelInfo, Voxel, Viewpoint, Grid, Piece, isColorSimilar} from "~lib"
import {Object3DCache, ResourceTracker} from "~/ui/utils/threejs.ts"

export function useGridDrawComposible(
    element: Ref<HTMLElement>,
    grid: Grid,
    pieces: ComputedRef<Piece[]>,
    layerN: Ref<number>,
    viewpoint: Ref<Viewpoint>,
    highlightedVoxel: Ref<Voxel | null>,
) {
    const renderer = new THREE.WebGLRenderer({antialias: true})
    renderer.setClearColor(0xdddddd, 1)
    const scene = new THREE.Scene()
    const fov = 75
    const camera = new THREE.PerspectiveCamera(fov, 2, 0.1, 10)
    let controls = new OrbitControls(camera, renderer.domElement)
    const hitTestObjects: Ref<THREE.Object3D[]> = ref([])
    
    const resourceTracker = new ResourceTracker()
    const objectCache = new Object3DCache()

    controls.addEventListener('change', refresh)

    onMounted(() => {
        const resizeObserver = new ResizeObserver(() => refresh())
        resizeObserver.observe(element.value)

        element.value.appendChild(renderer.domElement)

        watchEffect(() => {
            rebuild()
            refresh()
        })
    })
    
    onUnmounted(() => {
        resourceTracker.releaseAll()
        controls.dispose()
        renderer.dispose()
    })
    
    const voxelPieceMap = computed(() => {
        const map = new Map()
        for(const piece of pieces.value) {
            for(const voxel of piece.voxels) {
                map.set(voxel, piece)
            }
        }
        return map
    })
    function getPieceAtVoxel(voxel: Voxel): Piece | null {
        const piece = voxelPieceMap.value.get(voxel)
        return piece === undefined ? null : piece
    }

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

    function getLights(): THREE.Object3D {
        return objectCache.getOrSet("lights", () => {
            const light1 = new THREE.DirectionalLight(0xffffff, 3)
            light1.position.set(5, 5, 5)
            light1.lookAt(new Vector3(0, 0, 0))
            scene.add(light1)

            const light2 = new THREE.DirectionalLight(0xffffff, 3)
            light2.position.set(-5, -5, -5)
            light2.lookAt(new Vector3(0, 0, 0))
            scene.add(light2)
            
            const obj = new THREE.Object3D()
            obj.add(light1, light2)
            return obj
        })
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

    function getHighlightColor(piece: Piece | null) {
        const defaultColor = "#00ff00"
        const alternateColor = "#0000ff"
        if(piece === null || !isColorSimilar(piece.color, defaultColor)) {
            return defaultColor
        } else {
            return alternateColor
        }
    }

    function getVoxelSolid(
        piece: Piece | null,
        voxelInfo: VoxelInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const key = JSON.stringify([
            "solid",
            voxelInfo.voxel,
            piece?.color,
            inLayer,
            highlighted,
        ])
        let obj = objectCache.get(key)
        if(obj !== null) {
            return obj
        }

        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = new THREE.MeshPhongMaterial({
            color: piece ? piece.color : 0xffffff,
            side: THREE.DoubleSide,
            transparent: !inLayer,
            opacity: inLayer ? 1 : 0.5,
            depthWrite: inLayer,
        })

        obj = new THREE.Object3D()
        for(let polygon of Object.values(voxelInfo.sidePolygons)) {
            const geometry = new ConvexGeometry(polygon)
            const mesh = new THREE.Mesh(geometry, material)
            mesh.renderOrder = renderOrder
            obj.add(mesh)
        }

        objectCache.set(key, obj)
        return obj
    }
    
    function getVoxelThinWireframe(
        piece: Piece | null,
        voxelInfo: VoxelInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = new THREE.LineBasicMaterial({
            color: highlighted ? getHighlightColor(piece) : 0xaaaaaa,
            transparent: !inLayer,
            opacity: inLayer ? 1 : 0.5,
        })

        const obj = new THREE.Object3D()
        for(let polygon of Object.values(voxelInfo.sidePolygons)) {
            const geometry = new THREE.BufferGeometry()
            geometry.setFromPoints(polygon)
            const line = new THREE.LineLoop(geometry, material)
            line.renderOrder = renderOrder
            obj.add(line)
        }
        return obj
    }

    function getVoxelThickWireframe(
        piece: Piece | null,
        voxelInfo: VoxelInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = new THREE.MeshBasicMaterial({
            color: highlighted ? getHighlightColor(piece) : 0x000000,
        })
        const thickness = 0.005
        const divisions = 10

        const obj = new THREE.Object3D()
        for(let polygon of Object.values(voxelInfo.sidePolygons)) {
            for(let i=0; i<polygon.length; i++) {
                const point1 = polygon[i]
                const point2 = polygon[(i+1) % polygon.length]
                const path = new THREE.LineCurve3(
                    new Vector3(...point1),
                    new Vector3(...point2)
                )
                const tubeGeometry = new THREE.TubeGeometry(path, 2, thickness, divisions, false)
                const tube = new THREE.Mesh(tubeGeometry, material)
                tube.renderOrder = renderOrder
                obj.add(tube)
                
                const sphereGeometry = new THREE.SphereGeometry(thickness, divisions, divisions)
                sphereGeometry.translate(point1.x, point1.y, point1.z)
                const sphere = new THREE.Mesh(sphereGeometry, material)
                sphere.renderOrder = renderOrder
                obj.add(sphere)
            }
        }
        return obj
    }

    function getVoxelWireframe(
        piece: Piece | null,
        voxelInfo: VoxelInfo,
        inLayer: boolean,
        highlighted: boolean,
    ): THREE.Object3D {
        const key = JSON.stringify([
            "wireframe",
            voxelInfo.voxel,
            piece?.color,
            inLayer,
            highlighted,
        ])
        return objectCache.getOrSet(
            key,
            () => {
                if(inLayer) {
                    return getVoxelThickWireframe(piece, voxelInfo, inLayer, highlighted)
                } else {
                    return getVoxelThinWireframe(piece, voxelInfo, inLayer, highlighted)
                }
            }
        )

    }

    /* Call rebuild() when the objects in the scene need to be updated. */
    let isInitialRebuild = true
    function rebuild() {
        objectCache.newScene()
        objectCache.resetStats()
        resourceTracker.markUnused(scene)
        scene.clear()
        scene.add(getLights())
        
        hitTestObjects.value = []

        const bounds = grid.getMaxBounds(
            ...pieces.value.map(piece => piece.bounds)
        )

        for(let voxel of grid.getVoxels(bounds)) {
            const voxelInfo = grid.getVoxelInfo(voxel)
            const inLayer = viewpoint.value.isInLayer(voxel, layerN.value)
            const pieceAtVoxel = getPieceAtVoxel(voxel)

            let highlighted = voxel === highlightedVoxel.value

            const solid = getVoxelSolid(
                pieceAtVoxel,
                voxelInfo,
                inLayer,
                highlighted,
            )

            if(pieceAtVoxel) {
                scene.add(solid)
            }

            const wireframe = getVoxelWireframe(pieceAtVoxel, voxelInfo, inLayer, highlighted)
            scene.add(wireframe)
            
            if(inLayer) {
                // Populate hitTestObjects and save what voxel the object was
                // drawn for so we can pull it out later after a raycast
                // intersects it. Since Raycaster will find the leaf nodes of
                // our object tree, we need to set the userData on children.
                solid.children.forEach((child) => {
                    child.userData = {voxel}
                })
                hitTestObjects.value.push(solid)
            }
        }
        
        if(isInitialRebuild) {
            initializeCamera()
        }

        // Add axes helper after bounding box is computed so it doesn't affect the
        // center.
        const axesHelper = objectCache.getOrSet("axisHelper", () => {
            const obj = new THREE.AxesHelper()
            obj.position.set(-1, -1, -1)
            return obj
        })
        scene.add(axesHelper)

        resourceTracker.markUsed(scene)
        resourceTracker.releaseUnused()
        isInitialRebuild = false
    }

    return {
        renderer,
        scene,
        camera,
        hitTestObjects,
        redraw: () => {rebuild(); refresh()},
    }
}