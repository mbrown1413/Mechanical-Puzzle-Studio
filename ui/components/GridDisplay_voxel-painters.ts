import * as THREE from "three"
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js"

import {Voxel, Shape, SideInfo, tweakColor} from "~lib"
import {makeCylinderTransform} from "~/ui/utils/threejs-objects.ts"

type VoxelVisitData = {
    voxel: Voxel,
    sides: SideInfo[],
    shape: Shape | null,
    inLayer: boolean,
}

type DrawCondition = (args: VoxelVisitData) => boolean

/**
 * VoxelPainters accumulate data with each visit to a voxel, then emit objects
 * to add to the scene at the end. The key to having few objects and therefore
 * few webgl draw calls is that each painter emits a constant number of
 * objects, not depending on how many voxels were visited.
 */
export abstract class VoxelPainter {
    drawCondition: DrawCondition

    constructor(drawCondition: DrawCondition) {
        this.drawCondition = drawCondition
    }

    shouldVisit(args: VoxelVisitData): boolean {
        return this.drawCondition(args)
    }

    abstract visitVoxel(args: VoxelVisitData): void

    abstract makeObjects(): THREE.Object3D[]

}

export class GridPainter extends VoxelPainter {
    linePoints: [THREE.Vector3, THREE.Vector3][]
    spherePoints: Map<string, THREE.Vector3>
    material: THREE.Material
    thickness: number

    constructor(drawCondition: DrawCondition, material: THREE.Material, thickness: number) {
        super(drawCondition)
        this.linePoints = []
        this.spherePoints = new Map()
        this.material = material
        this.thickness = thickness
    }

    visitVoxel(
        {sides}: VoxelVisitData
    ) {
        for(const sideInfo of sides) {
            for(let i=0; i<sideInfo.wireframe.length; i++) {
                const point1 = sideInfo.wireframe[i]
                const point2 = sideInfo.wireframe[(i+1) % sideInfo.wireframe.length]
                this.linePoints.push([point1, point2])

                const sphereKey = point1.toArray().join(",")
                this.spherePoints.set(sphereKey, point1)
            }
        }
    }

    makeObjects() {
        const divisions = 4

        // Our lines are actually cylinders, as WebGL lines don't actually have
        // thickness.
        let i = 0
        const lines = new THREE.InstancedMesh(
            new THREE.CylinderGeometry(
                this.thickness,
                this.thickness,
                1,
                divisions,
                1,
                true
            ),
            this.material,
            this.linePoints.length
        )
        for(const [point1, point2] of this.linePoints) {
            lines.setMatrixAt(
                i++,
                makeCylinderTransform(point1, point2)
            )
        }

        // Spheres at each line end-point to make things look seamless.
        const spheres = new THREE.InstancedMesh(
            new THREE.SphereGeometry(this.thickness, divisions, divisions),
            this.material,
            this.spherePoints.size
        )
        const tempMatrix = new THREE.Matrix4()
        i = 0
        for(const point of this.spherePoints.values()) {
            spheres.setMatrixAt(
                i++,
                tempMatrix.makeTranslation(point)
            )
        }

        return [
            lines,
            spheres,
        ]
    }
}

export class ShapeVoxelPainter extends VoxelPainter {
    geometries: {
        default: THREE.BufferGeometry[]
        optional: THREE.BufferGeometry[]
    }
    highlightedShapes: Shape[]

    constructor(highlightedShapes: Shape[]) {
        super(() => true)
        this.geometries = {
            default: [],
            optional: [],
        }
        this.highlightedShapes = highlightedShapes
    }

    visitVoxel(
        {voxel, shape: shape, sides}: VoxelVisitData
    ) {
        if(!shape) { return }

        let color = shape && shape.color ? shape.color : "rgb(0,0,0)"
        if(this.highlightedShapes.includes(shape)) {
            // Discolor whole highlighted shape
            color = tweakColor(color)
        }
        const colorTuple = new THREE.Color(color).toArray()

        const optionalVoxel = Boolean(
            shape?.getVoxelAttribute("optional", voxel)
        )

        for(const side of sides) {
            const geometry = side.solid
            const nPoints = geometry.getAttribute("position").count
            const colors: number[] = []
            for(let i=0; i<nPoints; i++) {
                colors.push(...colorTuple)
            }
            geometry.setAttribute(
                "color",
                new THREE.Float32BufferAttribute(colors, 3)
            )
            if(optionalVoxel) {
                this.geometries.optional.push(geometry)
            } else {
                this.geometries.default.push(geometry)
            }
        }
    }

    makeObjects() {
        const objects: THREE.Object3D[] = []

        objects.push(...this.makeObject(
            this.geometries.default,
            new THREE.MeshPhongMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
            })
        ))

        objects.push(...this.makeObject(
            this.geometries.optional,
            new THREE.MeshPhongMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                map: this.makeOptionalVoxelTexture(),
            })
        ))

        return objects
    }

    makeObject(geometries: THREE.BufferGeometry[], material: THREE.Material): THREE.Object3D[] {
        if(geometries.length === 0) {
            return []
        }
        return [new THREE.Mesh(
            mergeGeometries(geometries),
            material
        )]
    }

    makeOptionalVoxelTexture() {
        const light = [255, 255, 255, 255]
        const dark = [100, 100, 100, 255]
        const buffer = new Uint8Array([
            ...light, ...dark,
            ...dark, ...light,
        ])
        const texture = new THREE.DataTexture(buffer, 2, 2, THREE.RGBAFormat)
        texture.repeat.set(4, 4)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.needsUpdate = true
        return texture
    }

}