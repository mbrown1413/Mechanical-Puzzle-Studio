import {ref, Ref, onMounted, onUnmounted, computed, watchEffect, watch} from "vue"

import * as THREE from "three"
import {Vector3} from "three"
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js"

import {Voxel, SideInfo, Viewpoint, Grid, Piece, Bounds, isColorSimilar} from "~lib"
import {VoxelPainter, GridPainter, PieceVoxelPainter} from "./GridDisplay_voxel-painters.ts"
import {CameraScheme, CameraSchemeName, ThreeDimensionalCameraScheme, TwoDimensionalCameraScheme} from "./GridDisplay_camera.ts"
import {ThreeJsResourceTracker} from "~/ui/utils/ThreeJsResourceTracker.ts"
import {multiRenderer} from "~/ui/utils/MultiRenderer.ts"

export function useGridDisplayRenderComposible(
    element: Ref<HTMLElement>,
    grid: Ref<Grid>,
    pieces: Ref<Piece[]>,
    bounds: Ref<Bounds>,
    displayOnly: boolean,
    layerN: Ref<number>,
    viewpoint: Ref<Viewpoint>,
    highlightedVoxels: Ref<Voxel[]>,
    highlightBy: "voxel" | "piece",
    cameraSchemeName: Ref<CameraSchemeName>,
) {
    const scene = new THREE.Scene()
    const hitTestObjects: Ref<THREE.Object3D[]> = ref([])
    const resourceTracker = new ThreeJsResourceTracker()
    let renderAreaId: string

    const gridBoundingBox = computed(() => getGridBoundingBox(grid.value, bounds.value))

    const availableCameraSchemes: Record<CameraSchemeName, CameraScheme> = {
        "2D": makeCameraScheme("2D"),
        "3D": makeCameraScheme("3D"),
    }
    const cameraScheme = computed(() =>
        availableCameraSchemes[cameraSchemeName.value]
    )

    onMounted(() => {
        renderAreaId = multiRenderer.addRenderArea(element.value, render)
        cameraScheme.value.enable(element.value)

        watchEffect(() => {
            buildScene()
            multiRenderer.requestRender()
        })

    })

    watch(cameraScheme, (newScheme, oldScheme) => {
        newScheme.enable(element.value)
        oldScheme.disable()
        multiRenderer.requestRender()
    })

    onUnmounted(() => {
        multiRenderer.removeRenderArea(renderAreaId)
        resourceTracker.releaseAll()
        for(const availableCameraScheme of Object.values(availableCameraSchemes)) {
            availableCameraScheme.dispose()
        }
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

    function makeCameraScheme(schemeName: CameraSchemeName): CameraScheme {
        let cameraSchemeClass
        if(schemeName === "2D") {
            cameraSchemeClass = TwoDimensionalCameraScheme
        } else {
            cameraSchemeClass = ThreeDimensionalCameraScheme
        }
        return new cameraSchemeClass(
            () => multiRenderer.requestRender(),
            bounds,
            gridBoundingBox,
            viewpoint,
            layerN,
        )
    }

    /* Call this when things like camera and window size change. */
    function render(renderer: THREE.WebGLRenderer) {
        const screenWidth = element.value.offsetWidth
        const screenHeight = element.value.offsetHeight
        cameraScheme.value.beforeRender(scene, screenWidth, screenHeight)
        renderer.render(scene, cameraScheme.value.camera)
    }

    /* Call rebuild() when the objects in the scene need to be updated. */
    function buildScene() {
        resourceTracker.markUnused(scene)
        scene.clear()
        scene.add(new THREE.AmbientLight(0xffffff, 1))

        cameraScheme.value.addObjects(scene)

        let highlightedPieces: Piece[]
        if(highlightBy === "piece" && highlightedVoxels.value.length) {
            highlightedPieces = [...new Set(
                highlightedVoxels.value.map(
                    voxel => getPieceAtVoxel(voxel)
                ).filter(
                    (piece): piece is Piece => piece !== null
                )
            )]
        } else {
            highlightedPieces = []
        }
        const highlightColor = new THREE.Color(
            getVoxelHighlightColor(highlightedPieces[0] || null)
        )

        // Voxel Painters accumulate data as we visit each voxel and at the
        // end they emit objects to add to the scene.
        const voxelPainters: VoxelPainter[] = [

            // Outline voxels in pieces with the grid wireframe
            new GridPainter(
                ({inLayer, piece}) => !inLayer && piece !== null,
                new THREE.MeshBasicMaterial({color: 0xcccccc}),
                0.015
            ),

            // Make a bolded grid on the current layer
            new GridPainter(
                ({inLayer}) => inLayer,
                new THREE.MeshBasicMaterial({color: 0x000000}),
                0.015
            ),

            // Draw solids for voxels with pieces
            new PieceVoxelPainter(highlightedPieces),

            // Different colored grid on highlighted voxel
            new GridPainter(
                ({voxel}) => highlightedVoxels.value.includes(voxel),
                new THREE.MeshBasicMaterial({color: highlightColor}),
                0.020
            )

        ]

        // Hide layer grid when no piece is selected
        if(pieces.value.length === 0) {
            voxelPainters.length = 0
        }

        hitTestObjects.value = []
        for(const voxel of cameraScheme.value.iterVoxels(grid.value)) {
            const voxelInfo = grid.value.getVoxelInfo(voxel)
            const inLayer = displayOnly ? false : viewpoint.value.isInLayer(voxel, layerN.value)
            const pieceAtVoxel = getPieceAtVoxel(voxel)
            const sides = voxelInfo.sides.map(side => grid.value.getSideInfo(voxel, side))

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
            if(displayOnly ? pieceAtVoxel : (inLayer || pieceAtVoxel)) {
                const object = getVoxelHitTestObject(sides)
                // Only add the voxel userData if we want this to be
                // highlighted. Otherwise it will occlude other voxels but not
                // be highlighted itself.
                if(displayOnly || inLayer) {
                    object.userData = {voxel}
                }
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
        camera: computed(() => cameraScheme.value.camera),
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