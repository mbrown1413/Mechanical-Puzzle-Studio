import { Point3d, Viewpoint } from "../types.ts"
import { Grid } from "../grid.ts"

type RectCoordinate = [number, number, number]
type RectSize = [number, number, number]
type RectDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z"
type RectCellType = "cube"

type RectCellInfo = {
    coordinate: RectCoordinate,
    type: RectCellType,
    sides: Array<RectDirection>,
    sidePolygons: {[key in RectDirection]: Point3d[]}
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
    size: RectSize

    constructor(size: RectSize) {
        super()
        this.size = size
    }
  
    _boundsCheck(x: number, y: number, z: number) {
        return (
            x >= 0 && x < this.size[0] &&
            y >= 0 && y < this.size[1] &&
            z >= 0 && z < this.size[2]
        )
    }
  
    getCellInfo(coordinate: RectCoordinate): RectCellInfo {
        let [x, y, z] = coordinate
        if(!this._boundsCheck(x, y, z)) {
            throw "getCell() called on out-of-bounds coordinate "+coordinate
        }
        return {
            coordinate: coordinate,
            type: "cube",  // The only type of cell in this grid
            sides: RECT_DIRS,
            sidePolygons: {
                "+X": [[1+x,   y,   z], [1+x, 1+y,   z], [1+x, 1+y, 1+z], [1+x,   y, 1+z]],
                "-X": [[  x,   y,   z], [  x, 1+y,   z], [  x, 1+y, 1+z], [  x,   y, 1+z]],
                "+Y": [[  x, 1+y,   z], [1+x, 1+y,   z], [1+x, 1+y, 1+z], [  x, 1+y, 1+z]],
                "-Y": [[  x,   y,   z], [1+x,   y,   z], [1+x,   y, 1+z], [  x,   y, 1+z]],
                "+Z": [[  x,   y, 1+z], [1+x,   y, 1+z], [1+x, 1+y, 1+z], [  x, 1+y, 1+z]],
                "-Z": [[  x,   y,   z], [1+x,   y,   z], [1+x, 1+y,   z], [  x, 1+y,   z]],
            }
        }
    }

    getCoordinates() {
        let ret = []
        for(let x=0; x<this.size[0]; x++) {
            for(let y=0; y<this.size[1]; y++) {
                for(let z=0; z<this.size[2]; z++) {
                    ret.push([x, y, z])
                }
            }
        }
        return ret
    }

    getAdjacent(coordinate: RectCoordinate, direction: RectDirection): [RectCoordinate|null, RectDirection] {
        let [x, y, z] = coordinate
        if(!this._boundsCheck(x, y, z)) {
            throw "getAdjacent() called on out-of-bounds coordinate "+coordinate
        }
        let [dx, dy, dz] = RECT_DIR_DELTAS[direction]
        let [nx, ny, nz] = [x+dx, y+dy, z+dz]
        let neighbor: RectCoordinate|null = null
        if(this._boundsCheck(nx, ny, nz)) {
            neighbor = [nx, ny, nz]
        }
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
            forwardVector: [0, 0, 1],
            xVector: [1, 0, 0],
            nLayers: this.size[2],
        }
        let xz: Viewpoint = {
            id: "xz",
            name: "X-Z Plane",
            forwardVector: [0, 1, 0],
            xVector: [1, 0, 0],
            nLayers: this.size[1],
        }
        let yz: Viewpoint = {
            id: "yz",
            name: "Y-Z Plane",
            forwardVector: [1, 0, 0],
            xVector: [0, 1, 0],
            nLayers: this.size[0],
        }
        return [xy, xz, yz]
    }
  
    getViewpointLayer(viewpointId: string, layerNumber: number) {
        let layerIndex: number;
        if(viewpointId === "xy") {
            layerIndex = 2
        } else if(viewpointId === "xz") {
            layerIndex = 1
        } else if(viewpointId === "yz") {
            layerIndex = 0
        } else {
            throw new Error("Unknown viewpoint ID "+viewpointId)
        }
        return this.getCoordinates().filter((coord) =>
            coord[layerIndex] === layerNumber
        )
    }

}