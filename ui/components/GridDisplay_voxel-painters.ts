import * as THREE from "three"
import {mergeGeometries, mergeVertices} from "three/addons/utils/BufferGeometryUtils.js"

import {Voxel, Piece, SideInfo, tweakColor} from "~lib"

type VoxelVisitData = {
    voxel: Voxel,
    sides: SideInfo[],
    piece: Piece | null,
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
                this.makeCylinderTransform(point1, point2)
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

    /** Returns a transform to place a cylinder to be placed starting at point1
     * and ending at point2. */
    makeCylinderTransform(
        point1: THREE.Vector3,
        point2: THREE.Vector3
    ): THREE.Matrix4 {
        const unitDirection = new THREE.Vector3().subVectors(point2, point1)
        const length = unitDirection.length()
        unitDirection.normalize()

        // The CylinderGeometry starts 1 unit long, centered at (0, 0, 0), with
        // its long axis pointing along the Y axis. Here we translate so it
        // goes from (0, 0, 0) to (0, 1, 0).
        const m = new THREE.Matrix4().makeTranslation(0, 0.5, 0)

        // Stretch so it's the same length as our target line
        m.premultiply(new THREE.Matrix4().makeScale(1, length, 1))

        // Rotate to point in the same direction as our target line
        const up = new THREE.Vector3(0, 1, 0)
        const q = new THREE.Quaternion().setFromUnitVectors(up, unitDirection)
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(q)
        m.premultiply(rotationMatrix)

        // Move from starting at (0, 0, 0) to our target start, point1.
        m.premultiply(new THREE.Matrix4().makeTranslation(point1))

        return m
    }
}

export class PieceVoxelPainter extends VoxelPainter {
    geometries: {
        default: THREE.BufferGeometry[]
        optional: THREE.BufferGeometry[]
    }
    highlightPiece: Piece | null

    constructor(highlightPiece: Piece | null = null) {
        super(() => true)
        this.geometries = {
            default: [],
            optional: [],
        }
        this.highlightPiece = highlightPiece
    }

    visitVoxel(
        {voxel, piece, sides}: VoxelVisitData
    ) {
        if(!piece) { return }

        let color = piece && piece.color ? piece.color : "rgb(0,0,0)"
        if(piece === this.highlightPiece) {
            // Discolor whole highlighted piece
            color = tweakColor(color)
        }
        const colorTuple = new THREE.Color(color).toArray()

        const optionalVoxel = Boolean(
            piece?.getVoxelAttribute("optional", voxel)
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
            mergeVertices(mergeGeometries(geometries)),
            material
        )]
    }

    makeOptionalVoxelTexture() {
        const dark = [255, 255, 255, 255]
        const light = [0, 0, 0, 255]
        const buffer = new Uint8Array([
            ...dark, ...light,
            ...light, ...dark,
        ])
        const texture = new THREE.DataTexture(buffer, 2, 2, THREE.RGBAFormat)
        texture.repeat.set(4, 4)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.needsUpdate = true
        return texture
    }

}