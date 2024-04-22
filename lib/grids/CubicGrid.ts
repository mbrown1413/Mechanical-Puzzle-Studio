import {Vector3, Matrix3, Matrix4, PlaneGeometry} from "three"

import {registerClass} from '~/lib/serialize.ts'
import {Grid, Bounds, Voxel, Viewpoint, Transform} from "~/lib/Grid.ts"

type Coordinate3d = {x: number, y: number, z: number}
type CubicBounds = [number, number, number]
type CubicDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z"
type CubicVoxelShape = "cube"

type CubicVoxelInfo = {
    voxel: Voxel,
    shape: CubicVoxelShape,
    sides: Array<CubicDirection>,
}

const CUBIC_DIRS: Array<CubicDirection> = [
    "+X", "-X", "+Y", "-Y", "+Z", "-Z"
]
const CUBIC_DIR_DELTAS = {
    "+X": [ 1,  0,  0],
    "-X": [-1,  0,  0],
    "+Y": [ 0,  1,  0],
    "-Y": [ 0, -1,  0],
    "+Z": [ 0,  0,  1],
    "-Z": [ 0,  0, -1],
}
const CUBIC_OPPOSITES: {[Property in CubicDirection]: CubicDirection} = {
    "+X": "-X",
    "-X": "+X",
    "+Y": "-Y",
    "-Y": "+Y",
    "+Z": "-Z",
    "-Z": "+Z",
}

const SIDE_POLYGONS: {[side in CubicDirection]: [number, number, number][]} = {
    "+X": [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    "-X": [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
    "+Y": [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
    "-Y": [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    "+Z": [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    "-Z": [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
}

function isCubicDirection(d: string): d is CubicDirection {
    return (
        (d[0] === "+" || d[0] === "-") &&
        (d[1] === "X" || d[1] === "Y" || d[1] === "Z")
    )
}

export class CubicGrid extends Grid {
    voxelToCoordinate(voxel: Voxel): Coordinate3d {
        const coord = voxel.split(",").map(Number)
        if(coord.length !== 3) {
            throw new Error(`Invalid cubic coordinate: ${voxel}`)
        }
        return {
            x: coord[0],
            y: coord[1],
            z: coord[2]
        }
    }

    coordinateToVoxel(coordinate: Coordinate3d): Voxel {
        return [coordinate.x, coordinate.y, coordinate.z].join(",")
    }

    getDimensions() {
        return [
            {name: "X", defaultBound: 5},
            {name: "Y", defaultBound: 5},
            {name: "Z", defaultBound: 5},
        ]
    }

    isInBounds(voxel: Voxel, bounds: CubicBounds): boolean {
        const {x, y, z} = this.voxelToCoordinate(voxel)
        return (
            x >= 0 && x < bounds[0] &&
            y >= 0 && y < bounds[1] &&
            z >= 0 && z < bounds[2]
        )
    }

    getVoxelBounds(...voxels: Voxel[]): Bounds {
        if(voxels.length === 0) {
            return this.getDefaultPieceBounds()
        }
        const bounds = [0, 0, 0]
        for(const voxel of voxels) {
            const {x, y, z} = this.voxelToCoordinate(voxel)
            bounds[0] = Math.max(bounds[0], x+1)
            bounds[1] = Math.max(bounds[1], y+1)
            bounds[2] = Math.max(bounds[2], z+1)
        }
        return bounds
    }

    getVoxelInfo(voxel: Voxel): CubicVoxelInfo {
        return {
            voxel: voxel,
            shape: "cube",  // The only shape of voxel in this grid
            sides: CUBIC_DIRS,
        }
    }

    getSideInfo(voxel: Voxel, direction: CubicDirection) {
        const {x, y, z} = this.voxelToCoordinate(voxel)
        const translation = new Vector3(x, y, z)
        const wireframe = SIDE_POLYGONS[direction].map(
            xyz => new Vector3(...xyz).add(translation)
        )

        // Construct transform for a plane for this side.
        const transform = new Matrix4()

        // Rotate along the plane normal purely so the UV texture coordinates
        // line up between sides.
        if(direction[0] === "+") {
            transform.premultiply(new Matrix4().makeRotationZ(Math.PI/2))
        }

        // Translate plane from z axis going through the center to z axis going
        // through the plane's corner.
        transform.premultiply(new Matrix4().makeTranslation(0.5, 0.5, 0))

        // Rotate to be on the X or Y plane if needed
        switch(direction[1]) {
            case "X": transform.premultiply(new Matrix4().makeRotationY(-Math.PI/2)); break
            case "Y": transform.premultiply(new Matrix4().makeRotationX(Math.PI/2)); break
        }

        // Translate to + side of the cube if needed
        transform.premultiply(new Matrix4().makeTranslation(
            direction === "+X" ? 1 : 0,
            direction === "+Y" ? 1 : 0,
            direction === "+Z" ? 1 : 0
        ))

        // Translate to this voxel's location
        transform.premultiply(new Matrix4().makeTranslation(x, y, z))

        return {
            solid: new PlaneGeometry().applyMatrix4(transform),
            wireframe,
        }
    }

    getVoxels(bounds: Bounds) {
        const ret = []
        for(let x=0; x<bounds[0]; x++) {
            for(let y=0; y<bounds[1]; y++) {
                for(let z=0; z<bounds[2]; z++) {
                    ret.push(this.coordinateToVoxel({x, y, z}))
                }
            }
        }
        return ret
    }

    getAdjacent(voxel: Voxel, direction: CubicDirection): [Voxel, CubicDirection] {
        const {x, y, z} = this.voxelToCoordinate(voxel)
        const [dx, dy, dz] = CUBIC_DIR_DELTAS[direction]
        const [nx, ny, nz] = [x+dx, y+dy, z+dz]
        const neighbor: Voxel|null = this.coordinateToVoxel({x: nx, y: ny, z: nz})
        const oppositeDir = CUBIC_OPPOSITES[direction]
        return [neighbor, oppositeDir]
    }

    getRotations() {
        return [
            "r:+X,0", "r:+X,1", "r:+X,2", "r:+X,3",
            "r:-X,0", "r:-X,1", "r:-X,2", "r:-X,3",
            "r:+Y,0", "r:+Y,1", "r:+Y,2", "r:+Y,3",
            "r:-Y,0", "r:-Y,1", "r:-Y,2", "r:-Y,3",
            "r:+Z,0", "r:+Z,1", "r:+Z,2", "r:+Z,3",
            "r:-Z,0", "r:-Z,1", "r:-Z,2", "r:-Z,3",
        ]
    }

    getTranslation(from: Voxel, to: Voxel) {
        const fromCoordinate = this.voxelToCoordinate(from)
        const toCoordinate = this.voxelToCoordinate(to)
        const offset = [
            toCoordinate.x - fromCoordinate.x,
            toCoordinate.y - fromCoordinate.y,
            toCoordinate.z - fromCoordinate.z,
        ]
        return `t:${offset[0]},${offset[1]},${offset[2]}`
    }

    doTransform(transform: Transform, voxels: Voxel[]): Voxel[] {

        if(/^t:(-?\d+,?){3}$/.test(transform)) {
            const offsets = transform.slice(2).split(",").map(Number)
            return voxels.map((voxel: Voxel) => {
                const coordinate = this.voxelToCoordinate(voxel)
                return this.coordinateToVoxel({
                    x: coordinate.x + offsets[0],
                    y: coordinate.y + offsets[1],
                    z: coordinate.z + offsets[2],
                })
            })
        }

        if(/^r:[+-][XYZ],[0123]$/.test(transform)) {
            const xFacingSide = transform.slice(2, 4)
            const xRotations = Number(transform[5])
            if(isCubicDirection(xFacingSide)) {
                return this.doRotation(xFacingSide, xRotations, voxels)
            }
        }

        throw new Error(`Transform in unknown format: ${transform}`)
    }

    private doRotation(xFacingSide: CubicDirection, xRotations: number, voxels: Voxel[]) {
        // Matrices to rotate 3D voxel around X, Y or Z axis (clockwise
        // when viewed from a positive coordinate looking down at the origin).
        const rotateX = new Matrix3(
            1, 0,  0,
            0, 0, -1,
            0, 1,  0
        )
        const rotateY = new Matrix3(
             0, 0, 1,
             0, 1, 0,
            -1, 0, 0
        )
        const rotateZ = new Matrix3(
            0, -1, 0,
            1,  0, 0,
            0,  0, 1
        )

        // Each of these rotation matrices transform the given face so it's facing +X
        const faceXMatrices = {
            "+X": new Matrix3().identity(),
            "-X": rotateZ.clone().multiply(rotateZ),
            "+Y": rotateZ,
            "-Y": rotateZ.clone().multiply(rotateZ).multiply(rotateZ),
            "+Z": rotateY.clone().multiply(rotateY).multiply(rotateY),
            "-Z": rotateY,
        }

        function coordinateMultiply(coord: Coordinate3d, m: THREE.Matrix3): Coordinate3d {
            return {
                x: coord.x*m.elements[0] + coord.y*m.elements[1] + coord.z*m.elements[2],
                y: coord.x*m.elements[3] + coord.y*m.elements[4] + coord.z*m.elements[5],
                z: coord.x*m.elements[6] + coord.y*m.elements[7] + coord.z*m.elements[8],
            }
        }

        const coordinates = voxels.map((voxel) => {
            let coordinate = this.voxelToCoordinate(voxel)
            coordinate = coordinateMultiply(coordinate, faceXMatrices[xFacingSide])
            for(let i=0; i<xRotations; i++) {
                coordinate = coordinateMultiply(coordinate, rotateX)
            }
            return coordinate
        })

        const minX = Math.min(...coordinates.map(c => c.x))
        const minY = Math.min(...coordinates.map(c => c.y))
        const minZ = Math.min(...coordinates.map(c => c.z))
        return coordinates.map((coordinate) =>
            this.coordinateToVoxel({
                x: coordinate.x - minX,
                y: coordinate.y - minY,
                z: coordinate.z - minZ
            })
        )
    }

    getViewpoints() {
        const xy: Viewpoint = {
            id: "xy",
            name: "X-Y Plane",
            forwardVector: new Vector3(0, 0, -1),
            xVector: new Vector3(1, 0, 0),
            getNLayers(bounds) { return bounds[2] },
            isInLayer: (voxel, layerIndex) => this.voxelToCoordinate(voxel).z == layerIndex,
        }
        const xz: Viewpoint = {
            id: "xz",
            name: "X-Z Plane",
            forwardVector: new Vector3(0, -1, 0),
            xVector: new Vector3(1, 0, 0),
            getNLayers(bounds) { return bounds[1] },
            isInLayer: (voxel, layerIndex) => this.voxelToCoordinate(voxel).y == layerIndex,
        }
        const yz: Viewpoint = {
            id: "yz",
            name: "Y-Z Plane",
            forwardVector: new Vector3(-1, 0, 0),
            xVector: new Vector3(0, 0, -1),
            getNLayers(bounds) { return bounds[0] },
            isInLayer: (voxel, layerIndex) => this.voxelToCoordinate(voxel).x == layerIndex,
        }
        return [xy, xz, yz]
    }

    getDisassemblyTransforms(): Transform[] {
        return Object.values(CUBIC_DIR_DELTAS).map(delta =>
            this.getTranslation("0,0,0", `${delta[0]},${delta[1]},${delta[2]}`)
        )
    }

    isSeparate(group1: Voxel[], group2: Voxel[]): boolean {
        type Box = {
            x0: number, x1: number
            y0: number, y1: number
            z0: number, z1: number
        }

        function getBox(coordinates: Coordinate3d[]): Box {
            return {
                x0: Math.min(...coordinates.map(c => c.x)),
                x1: Math.max(...coordinates.map(c => c.x)),
                y0: Math.min(...coordinates.map(c => c.y)),
                y1: Math.max(...coordinates.map(c => c.y)),
                z0: Math.min(...coordinates.map(c => c.z)),
                z1: Math.max(...coordinates.map(c => c.z)),
            }
        }

        function boxesAreSeparate(box1: Box, box2: Box): boolean {
            return (
                box1.x0 > box2.x1 || box1.x1 < box2.x0 ||
                box1.y0 > box2.y1 || box1.y1 < box2.y0 ||
                box1.z0 > box2.z1 || box1.z1 < box2.z0
            )
        }

        const box1 = getBox(group1.map(this.voxelToCoordinate))
        const box2 = getBox(group2.map(this.voxelToCoordinate))
        return boxesAreSeparate(box1, box2)
    }
}

registerClass(CubicGrid)