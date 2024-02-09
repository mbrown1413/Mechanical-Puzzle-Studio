import {Vector3, Matrix3} from "three"

import {registerClass} from '~/lib/serialize.ts'
import {Grid, Bounds, Voxel, Viewpoint} from "~/lib/Grid.ts"

type Coordinate3d = {x: number, y: number, z: number}
type CubicBounds = [number, number, number]
type CubicTranslation = [number, number, number]
type CubicDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z"
type CubicVoxelShape = "cube"

type CubicVoxelInfo = {
    voxel: Voxel,
    shape: CubicVoxelShape,
    sides: Array<CubicDirection>,
    sidePolygons: {[key in CubicDirection]: Vector3[]}
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

export class CubicGrid extends Grid {
    private voxelToCoordinate(voxel: Voxel): Coordinate3d {
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
    
    private coordinateToVoxel(coordinate: Coordinate3d): Voxel {
        return [coordinate.x, coordinate.y, coordinate.z].join(",")
    }

    getDimensions() {
        return [
            {name: "X", defaultBound: 3},
            {name: "Y", defaultBound: 3},
            {name: "Z", defaultBound: 3},
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

    getVoxelInfo(voxel: Voxel): CubicVoxelInfo {
        const {x, y, z} = this.voxelToCoordinate(voxel)
        const v = (x: number, y: number, z: number) => new Vector3(x, y, z)
        return {
            voxel: voxel,
            shape: "cube",  // The only shape of voxel in this grid
            sides: CUBIC_DIRS,
            sidePolygons: {
                "+X": [v(1+x,   y,   z), v(1+x, 1+y,   z), v(1+x, 1+y, 1+z), v(1+x,   y, 1+z)],
                "-X": [v(  x,   y,   z), v(  x, 1+y,   z), v(  x, 1+y, 1+z), v(  x,   y, 1+z)],
                "+Y": [v(  x, 1+y,   z), v(1+x, 1+y,   z), v(1+x, 1+y, 1+z), v(  x, 1+y, 1+z)],
                "-Y": [v(  x,   y,   z), v(1+x,   y,   z), v(1+x,   y, 1+z), v(  x,   y, 1+z)],
                "+Z": [v(  x,   y, 1+z), v(1+x,   y, 1+z), v(1+x, 1+y, 1+z), v(  x, 1+y, 1+z)],
                "-Z": [v(  x,   y,   z), v(1+x,   y,   z), v(1+x, 1+y,   z), v(  x, 1+y,   z)],
            }
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

    getOrientations() {
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

        // Rotate each face to point in the +X direction, then rotate on the X
        // axis 0-3 times. This covers all possible orientations.
        const orientationMatrices = []
        for(const faceXMatrix of Object.values(faceXMatrices)) {
            for(const nXRotations of [0, 1, 2, 3]) {
                const matrix = faceXMatrix.clone()
                for(let i=0; i<nXRotations; i++) {
                    matrix.multiply(rotateX)
                }
                orientationMatrices.push(matrix)
            }
        }

        function coordinateMultiply(coord: Coordinate3d, m: THREE.Matrix3): Coordinate3d {
            return {
                x: coord.x*m.elements[0] + coord.y*m.elements[1] + coord.z*m.elements[2],
                y: coord.x*m.elements[3] + coord.y*m.elements[4] + coord.z*m.elements[5],
                z: coord.x*m.elements[6] + coord.y*m.elements[7] + coord.z*m.elements[8],
            }
        }

        return orientationMatrices.map((matrix) => {
            const orientationFunc = (voxels: Voxel[]) => {
                const newCoordinates = voxels.map(
                    (v) => coordinateMultiply(this.voxelToCoordinate(v), matrix)
                )
                const minX = Math.min(...newCoordinates.map(c => c.x))
                const minY = Math.min(...newCoordinates.map(c => c.y))
                const minZ = Math.min(...newCoordinates.map(c => c.z))
                return newCoordinates.map(c => {
                    return this.coordinateToVoxel({
                        x: c.x-minX,
                        y: c.y-minY,
                        z: c.z-minZ
                    })
                })
            }
            return { orientationFunc }
        })
    }

    translate(voxel: Voxel, translation: CubicTranslation) {
        const coordinate = this.voxelToCoordinate(voxel)
        return this.coordinateToVoxel({
            x: coordinate.x + translation[0],
            y: coordinate.y + translation[1],
            z: coordinate.z + translation[2],
        })
    }

    getTranslation(from: Voxel, to: Voxel): CubicTranslation {
        const fromCoordinate = this.voxelToCoordinate(from)
        const toCoordinate = this.voxelToCoordinate(to)
        return [
            toCoordinate.x - fromCoordinate.x,
            toCoordinate.y - fromCoordinate.y,
            toCoordinate.z - fromCoordinate.z,
        ]
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
}

registerClass(CubicGrid)