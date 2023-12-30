import {Vector3, Matrix3} from "three"

import {Bounds, Coordinate, Viewpoint} from "~lib/types.ts"
import {registerClass} from '~lib/serialize.ts'
import {Grid} from "~lib/Grid.ts"

type RectCoordinate = [number, number, number]
type RectBounds = [number, number, number]
type RectTranslation = [number, number, number]
type RectDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z"
type RectCellType = "cube"

type RectCellInfo = {
    coordinate: RectCoordinate,
    type: RectCellType,
    sides: Array<RectDirection>,
    sidePolygons: {[key in RectDirection]: Vector3[]}
}

const RECT_DIRS: Array<RectDirection> = [
    "+X", "-X", "+Y", "-Y", "+Z", "-Z"
]
const RECT_DIR_DELTAS = {
    "+X": [ 1,  0,  0],
    "-X": [-1,  0,  0],
    "+Y": [ 0,  1,  0],
    "-Y": [ 0, -1,  0],
    "+Z": [ 0,  0,  1],
    "-Z": [ 0,  0, -1],
}
const RECT_OPPOSITES: {[Property in RectDirection]: RectDirection} = {
    "+X": "-X",
    "-X": "+X",
    "+Y": "-Y",
    "-Y": "+Y",
    "+Z": "-Z",
    "-Z": "+Z",
}

export class RectGrid extends Grid {

    getDimensions() {
        return [
            {name: "X", defaultBound: 3},
            {name: "Y", defaultBound: 3},
            {name: "Z", defaultBound: 3},
        ]
    }

    isInBounds(bounds: RectBounds, coordinate: RectCoordinate): Boolean {
        let [x, y, z] = coordinate
        return (
            x >= 0 && x < bounds[0] &&
            y >= 0 && y < bounds[1] &&
            z >= 0 && z < bounds[2]
        )
    }

    getCellInfo(coordinate: RectCoordinate): RectCellInfo {
        let [x, y, z] = coordinate
        let v = (x: number, y: number, z: number) => new Vector3(x, y, z)
        return {
            coordinate: coordinate,
            type: "cube",  // The only type of cell in this grid
            sides: RECT_DIRS,
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

    getCoordinates(bounds: Bounds) {
        let ret = []
        for(let x=0; x<bounds[0]; x++) {
            for(let y=0; y<bounds[1]; y++) {
                for(let z=0; z<bounds[2]; z++) {
                    ret.push([x, y, z])
                }
            }
        }
        return ret
    }

    getAdjacent(coordinate: RectCoordinate, direction: RectDirection): [RectCoordinate, RectDirection] {
        let [x, y, z] = coordinate
        let [dx, dy, dz] = RECT_DIR_DELTAS[direction]
        let [nx, ny, nz] = [x+dx, y+dy, z+dz]
        let neighbor: RectCoordinate|null = [nx, ny, nz]
        let oppositeDir = RECT_OPPOSITES[direction]
        return [neighbor, oppositeDir]
    }

    getOrientations() {
        // Matrices to rotate 3D coordinate around X, Y or Z axis (clockwise
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
            for(let nXRotations of [0, 1, 2, 3]) {
                const matrix = faceXMatrix.clone()
                for(let i=0; i<nXRotations; i++) {
                    matrix.multiply(rotateX)
                }
                orientationMatrices.push(matrix)
            }
        }

        function coordinateMultiply(coord: Coordinate, m: THREE.Matrix3): RectCoordinate {
            return [
                coord[0]*m.elements[0] + coord[1]*m.elements[1] + coord[2]*m.elements[2],
                coord[0]*m.elements[3] + coord[1]*m.elements[4] + coord[2]*m.elements[5],
                coord[0]*m.elements[6] + coord[1]*m.elements[7] + coord[2]*m.elements[8],
            ]
        }

        return orientationMatrices.map((matrix) => {
            return {
                orientationFunc(coords: Coordinate[]): RectCoordinate[] {
                    const newCoords = coords.map((coord) => coordinateMultiply(coord, matrix))
                    let minX = Math.min(...newCoords.map(c => c[0]))
                    let minY = Math.min(...newCoords.map(c => c[1]))
                    let minZ = Math.min(...newCoords.map(c => c[2]))
                    return newCoords.map(c => [c[0]-minX, c[1]-minY, c[2]-minZ])
                }
            }
        })
    }

    translate(coordinate: RectCoordinate, translation: RectTranslation) {
        return [
            coordinate[0] + translation[0],
            coordinate[1] + translation[1],
            coordinate[2] + translation[2],
        ]
    }

    getTranslation(from: RectCoordinate, to: RectCoordinate): RectTranslation {
        return [
            to[0] - from[0],
            to[1] - from[1],
            to[2] - from[2],
        ]
    }

    getViewpoints() {
        let xy: Viewpoint = {
            id: "xy",
            name: "X-Y Plane",
            forwardVector: new Vector3(0, 0, -1),
            xVector: new Vector3(1, 0, 0),
            getNLayers(bounds) { return bounds[2] },
            isInLayer(coordinate, layerIndex) { return coordinate[2] == layerIndex },
        }
        let xz: Viewpoint = {
            id: "xz",
            name: "X-Z Plane",
            forwardVector: new Vector3(0, -1, 0),
            xVector: new Vector3(1, 0, 0),
            getNLayers(bounds) { return bounds[1] },
            isInLayer(coordinate, layerIndex) { return coordinate[1] == layerIndex },
        }
        let yz: Viewpoint = {
            id: "yz",
            name: "Y-Z Plane",
            forwardVector: new Vector3(-1, 0, 0),
            xVector: new Vector3(0, 0, -1),
            getNLayers(bounds) { return bounds[0] },
            isInLayer(coordinate, layerIndex) { return coordinate[0] == layerIndex },
        }
        return [xy, xz, yz]
    }
}

registerClass(RectGrid)