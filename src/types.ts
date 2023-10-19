import { Vector3 } from 'three'

export type Size = Array<number>
export type Coordinate = Array<any>
export type Direction = string

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
    nLayers: number,
    forwardVector: Vector3,
    xVector: Vector3,
}

export type Transform = {
    id: string,
}

export type BoolWithReason = {
    truth: true
    reason?: string
} | {
    truth: false,
    reason: string
}