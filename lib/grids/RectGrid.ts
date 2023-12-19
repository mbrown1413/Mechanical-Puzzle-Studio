import {Vector3} from "three"

import {Bounds, Viewpoint} from "~lib/types.ts"
import {registerClass} from '~lib/serialize.ts'
import {Grid} from "~lib/Grid.ts"

type RectCoordinate = [number, number, number]
type RectBounds = [number, number, number]
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
  
    /*
    getTransforms(cell: RectCellType | RectCellInfo): Iterable<Transform> {
        return []
    }
    
    applyTransform(cell: RectCellInfo, transform: RectTransform): RectCellInfo {
    }
    */
  
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