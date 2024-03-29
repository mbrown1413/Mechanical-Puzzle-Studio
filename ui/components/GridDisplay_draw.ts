import {ref, Ref, ComputedRef, onMounted, onUnmounted, computed, watchEffect, watch} from "vue"

import * as THREE from "three"
import {Vector3} from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {ConvexGeometry} from "three/addons/geometries/ConvexGeometry.js"

import {VoxelInfo, Voxel, Viewpoint, Grid, Piece, Bounds, isColorSimilar, tweakColor} from "~lib"
import {Object3DCache, ResourceTracker} from "~/ui/utils/threejs.ts"
import {multiRenderer} from "~/ui/utils/MultiRenderer.ts"

export function useGridDrawComposible(
    element: Ref<HTMLElement>,
    grid: Grid,
    pieces: ComputedRef<Piece[]>,
    bounds: ComputedRef<Bounds>,
    displayOnly: boolean,
    layerN: Ref<number>,
    viewpoint: Ref<Viewpoint>,
    highlightedVoxel: Ref<Voxel | null>,
    highlightBy: "voxel" | "piece",
) {
    const scene = new THREE.Scene()
    const fov = 75
    const camera = new THREE.PerspectiveCamera(fov, 2, 0.1, 10)
    let controls: OrbitControls | null = null
    const hitTestObjects: Ref<THREE.Object3D[]> = ref([])

    const resourceTracker = new ResourceTracker()
    const objectCache = new Object3DCache()
    let renderAreaId: string

    onMounted(() => {
        renderAreaId = multiRenderer.addRenderArea(element.value, render)

        controls = new OrbitControls(camera, element.value)
        controls.addEventListener('change', () => multiRenderer.requestRender())

        watchEffect(() => {
            buildScene()
            multiRenderer.requestRender()
        })

        setCameraPosition()
        setCameraTarget()

        watch(() => [...bounds.value], () => {
            setCameraTarget()
        })
    })

    onUnmounted(() => {
        multiRenderer.removeRenderArea(renderAreaId)
        resourceTracker.releaseAll()
        controls?.dispose()
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
    function render(renderer: THREE.WebGLRenderer) {
        const width = element.value.offsetWidth
        const height = element.value.offsetHeight
        camera.aspect = width / height
        camera.updateProjectionMatrix()

        // Calculate camera near/far to fit entire scene
        const boundingBox = new THREE.Box3().setFromObject(scene)
        const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere())
        const sphereDistance = boundingSphere.distanceToPoint(camera.position)
        camera.near = Math.max(sphereDistance * .9, 0.1)
        camera.far = (sphereDistance + boundingSphere.radius*2) * 1.1

        renderer.render(scene, camera)
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

    function setCameraPosition() {
        const boundingBox = getGridBoundingBox(grid, bounds.value)
        const center = boundingBox.getCenter(new Vector3())

        const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere())
        const fovRadians = fov * (Math.PI/180)
        const cameraPosition = viewpoint.value.forwardVector.clone().normalize()
        cameraPosition.multiplyScalar(
            -1 * (boundingSphere.radius * 1.2) / Math.tan(fovRadians / 2)
        )
        cameraPosition.add(center)
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    }

    function setCameraTarget() {
        const boundingBox = getGridBoundingBox(grid, bounds.value)
        const center = boundingBox.getCenter(new Vector3())

        if(controls) {
            controls.target = center
            camera.lookAt(center)
        }
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
        highlightBy: "voxel" | "piece",
    ): THREE.Object3D {
        const key = JSON.stringify([
            "solid",
            voxelInfo.voxel,
            piece?.color,
            inLayer,
            highlighted,
            highlightBy,
        ])
        let obj = objectCache.get(key)
        if(obj !== null) {
            return obj
        }

        let color = piece ? piece.color : "rgb(0,0,0)"
        if(piece && highlighted && highlightBy === "piece") {
            // Discolor whole highlighted piece
            color = tweakColor(color)
        }

        const renderOrder = getRenderOrder(inLayer, highlighted)
        const material = new THREE.MeshPhongMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: !inLayer,
            opacity: inLayer ? 1 : 0.5,
            depthWrite: inLayer,
        })

        obj = new THREE.Object3D()
        for(const polygon of Object.values(voxelInfo.sidePolygons)) {
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
        for(const polygon of Object.values(voxelInfo.sidePolygons)) {
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
        const divisions = 4

        const obj = new THREE.Object3D()
        for(const polygon of Object.values(voxelInfo.sidePolygons)) {
            for(let i=0; i<polygon.length; i++) {
                const point1 = polygon[i]
                const point2 = polygon[(i+1) % polygon.length]
                const path = new THREE.LineCurve3(
                    new Vector3(...point1),
                    new Vector3(...point2)
                )

                const tubeKey = JSON.stringify([
                    "Tube",
                    renderOrder,
                    [
                        `${point1.x},${point1.y},${point1.z}`,
                        `${point2.x},${point2.y},${point2.z}`,
                    ].sort()
                ])
                if(objectCache.usedInCurrentScene(tubeKey)) {
                    continue
                }

                const tubeGeometry = new THREE.TubeGeometry(path, 1, thickness, divisions, false)
                const tube = new THREE.Mesh(tubeGeometry, material)
                tube.renderOrder = renderOrder
                obj.add(tube)
                objectCache.set(tubeKey, tube)

                for(const spherePoint of [point1, point2]) {
                    const sphereKey = JSON.stringify([
                        "Sphere",
                        `${spherePoint.x},${spherePoint.y},${spherePoint.z}`,
                        renderOrder,
                    ])
                    if(objectCache.usedInCurrentScene(sphereKey)) {
                        continue
                    }

                    const sphereGeometry = new THREE.SphereGeometry(thickness, divisions, divisions)
                    sphereGeometry.translate(spherePoint.x, spherePoint.y, spherePoint.z)
                    const sphere = new THREE.Mesh(sphereGeometry, material)
                    sphere.renderOrder = renderOrder
                    obj.add(sphere)
                    objectCache.set(sphereKey, sphere)
                }
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
    function buildScene() {
        objectCache.newScene()
        objectCache.resetStats()
        resourceTracker.markUnused(scene)
        scene.clear()
        scene.add(getLights())

        hitTestObjects.value = []

        for(const voxel of grid.getVoxels(bounds.value)) {
            const voxelInfo = grid.getVoxelInfo(voxel)
            const inLayer = displayOnly ? true : viewpoint.value.isInLayer(voxel, layerN.value)
            const pieceAtVoxel = getPieceAtVoxel(voxel)

            const highlightedFunc: () => boolean = {
                "voxel": () => voxel === highlightedVoxel.value,
                "piece": () => {
                    return highlightedVoxel.value !== null &&
                        pieceAtVoxel === getPieceAtVoxel(highlightedVoxel.value)
                },
            }[highlightBy]
            const highlighted = highlightedFunc()

            const solid = getVoxelSolid(
                pieceAtVoxel,
                voxelInfo,
                inLayer,
                highlighted,
                highlightBy,
            )

            if(pieceAtVoxel) {
                scene.add(solid)
            }

            if(!displayOnly || pieceAtVoxel) {
                const wireframe = getVoxelWireframe(pieceAtVoxel, voxelInfo, inLayer, highlighted)
                scene.add(wireframe)
            }

            if(displayOnly ? pieceAtVoxel : inLayer) {
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

        const axesHelper = objectCache.getOrSet("axesHelper", () => {
            const obj = new THREE.AxesHelper()
            obj.position.set(-1, -1, -1)
            return obj
        })
        scene.add(axesHelper)

        resourceTracker.markUsed(scene)
        resourceTracker.releaseUnused()
    }

    return {
        scene,
        camera,
        hitTestObjects,
    }
}

function getGridBoundingBox(grid: Grid, bounds: Bounds): THREE.Box3 {
    const points = getAllGridVertices(grid, bounds)
    const min = new Vector3(points[0].x, points[0].y, points[0].z)
    const max = new Vector3(points[0].x, points[0].y, points[0].z)
    for(const point of points) {
        min.x = Math.min(min.x, point.x)
        min.y = Math.min(min.y, point.y)
        min.z = Math.min(min.z, point.z)
        max.x = Math.max(max.x, point.x)
        max.y = Math.max(max.y, point.y)
        max.z = Math.max(max.z, point.z)
    }
    return new THREE.Box3(min, max)
}

function getAllGridVertices(grid: Grid, bounds: Bounds): Vector3[] {
    const points = []
    for(const voxel of grid.getVoxels(bounds)) {
        const voxelInfo = grid.getVoxelInfo(voxel)
        for(const polygon of Object.values(voxelInfo.sidePolygons)) {
            points.push(...polygon)
        }
    }
    return points
}