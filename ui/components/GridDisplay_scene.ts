import {ref, Ref, ComputedRef, onMounted, onUnmounted, computed, watchEffect, watch} from "vue"

import * as THREE from "three"
import {Vector3} from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js"

import {Voxel, SideInfo, Viewpoint, Grid, Piece, Bounds, isColorSimilar} from "~lib"
import {ThreeJsResourceTracker} from "~/ui/utils/ThreeJsResourceTracker.ts"
import {VoxelPainter, GridPainter, PieceVoxelPainter} from "./GridDisplay_voxel-painters.ts"
import {multiRenderer} from "~/ui/utils/MultiRenderer.ts"

export function useGridDisplaySceneComposible(
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

    const resourceTracker = new ThreeJsResourceTracker()
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

        watch(() => bounds.value, () => {
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

    const gridBoundingBox = computed(() => getGridBoundingBox(grid, bounds.value))

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

    function setCameraPosition() {
        const center = gridBoundingBox.value.getCenter(new Vector3())

        const boundingSphere = gridBoundingBox.value.getBoundingSphere(new THREE.Sphere())
        const fovRadians = fov * (Math.PI/180)
        const cameraPosition = viewpoint.value.forwardVector.clone().normalize()
        cameraPosition.multiplyScalar(
            -1 * (boundingSphere.radius * 1.2) / Math.tan(fovRadians / 2)
        )
        cameraPosition.add(center)
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    }

    function setCameraTarget() {
        if(controls) {
            const center = gridBoundingBox.value.getCenter(new Vector3())
            controls.target = center
            camera.lookAt(center)
        }
    }

    /* Call rebuild() when the objects in the scene need to be updated. */
    function buildScene() {
        resourceTracker.markUnused(scene)
        scene.clear()
        scene.add(...getLights())

        const gridBoxSize = gridBoundingBox.value.getSize(new Vector3())
        const axesHelper = new THREE.AxesHelper(Math.max(...gridBoxSize.toArray()) + 1)
        axesHelper.position.set(-1, -1, -1)
        scene.add(axesHelper)

        let highlightedPiece: Piece | null = null
        if(highlightBy === "piece" && highlightedVoxel.value) {
            highlightedPiece = getPieceAtVoxel(highlightedVoxel.value)
        }
        const highlightColor = new THREE.Color(
            getVoxelHighlightColor(highlightedPiece)
        )

        // Voxel Painters accumulate data as we visit each voxel and at the
        // end they emit objects to add to the scene.
        const voxelPainters: VoxelPainter[] = [

            // Outline voxels in pieces with the grid wireframe
            new GridPainter(
                ({inLayer, piece}) => !inLayer && piece !== null,
                new THREE.MeshBasicMaterial({color: 0xdddddd}),
                0.002
            ),

            // Make a bolded grid on the current layer
            new GridPainter(
                ({inLayer}) => inLayer,
                new THREE.MeshBasicMaterial({color: 0x000000}),
                0.005
            ),

            // Draw solids for voxels with pieces
            new PieceVoxelPainter(highlightedPiece),

            // Different colored grid on highlighted voxel
            new GridPainter(
                ({voxel}) => voxel === highlightedVoxel.value,
                new THREE.MeshBasicMaterial({color: highlightColor}),
                0.005
            )

        ]

        hitTestObjects.value = []
        for(const voxel of grid.getVoxels(bounds.value)) {
            const voxelInfo = grid.getVoxelInfo(voxel)
            const inLayer = displayOnly ? false : viewpoint.value.isInLayer(voxel, layerN.value)
            const pieceAtVoxel = getPieceAtVoxel(voxel)
            const sides = voxelInfo.sides.map(side => grid.getSideInfo(voxel, side))

            for(const voxelPainter of voxelPainters) {
                const args = {
                    voxel,
                    sides,
                    piece: pieceAtVoxel,
                    inLayer,
                }
                if(!voxelPainter.shouldVisit(args)) { continue }
                voxelPainter.visitVoxel(args)
            }

            // Populate hitTestObjects and save what voxel the object was drawn
            // for so we can pull it out later after a raycast intersects it.
            if(displayOnly ? pieceAtVoxel : inLayer) {
                const object = getVoxelHitTestObject(sides)
                object.userData = {voxel}
                hitTestObjects.value.push(object)
            }
        }

        for(const voxelPainter of voxelPainters) {
            const objects = voxelPainter.makeObjects()
            if(objects.length) {
                scene.add(...objects)
            }
        }

        resourceTracker.markUsed(scene)
        resourceTracker.releaseUnused()
    }

    return {
        scene,
        camera,
        hitTestObjects,
    }
}

function getLights(): THREE.Object3D[] {
    const light1 = new THREE.DirectionalLight(0xffffff, 3)
    light1.position.set(5, 5, 5)
    light1.lookAt(new Vector3(0, 0, 0))

    const light2 = new THREE.DirectionalLight(0xffffff, 3)
    light2.position.set(-5, -5, -5)
    light2.lookAt(new Vector3(0, 0, 0))

    return [light1, light2]
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
        for(const side of voxelInfo.sides) {
            const sideInfo = grid.getSideInfo(voxel, side)
            points.push(...sideInfo.wireframe)
        }
    }
    return points
}

function getVoxelHighlightColor(piece: Piece | null) {
    const defaultColor = "#00ff00"
    const alternateColor = "#0000ff"
    if(piece === null || piece.color === undefined || !isColorSimilar(piece.color, defaultColor)) {
        return defaultColor
    } else {
        return alternateColor
    }
}

function getVoxelHitTestObject(sides: SideInfo[]): THREE.Object3D {
    const solids = sides.map(side => side.solid)
    const geometries = mergeGeometries(solids)
    return new THREE.Mesh(
        geometries,
        new THREE.MeshBasicMaterial({side: THREE.DoubleSide})
    )
}