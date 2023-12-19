import { Vector3 } from 'three'

export type Bounds = Array<number>
export type Coordinate = Array<any>
export type Direction = string

export type Dimension = {
    name: string,
    defaultBound?: number,
}

export type CellType = string

export type CellInfo = {
    coordinate: Coordinate,
    type: CellType,
    sides: Array<Direction>,
    sidePolygons: {[key: Direction]: Vector3[]}
}

export type Viewpoint = {
    id: string,
    name: string,
    forwardVector: Vector3,
    xVector: Vector3,
    getNLayers(bounds: Bounds): number,
    isInLayer(coordinate: Coordinate, layerIndex: number): boolean,
}

export type Transform = {
    id: string,
}

/* Stores a boolean, and an optional reason for its value. If `false`, the
 * reason is required. Used for success/failure return values. */
export type BoolWithReason = {
    bool: true
    reason?: string
} | {
    bool: false,
    reason: string
}