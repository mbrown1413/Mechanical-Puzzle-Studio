
export type Size = Array<number>
export type Coordinate = Array<any>
export type Direction = string
export type Point2d = [number, number]
export type Point3d = [number, number, number]
export type Vector = [number, number, number]

export type CellType = string

export type CellInfo = {
    coordinate: Coordinate,
    type: CellType,
    sides: Array<Direction>,
    sidePolygons: {[key: Direction]: Point3d[]}
}

export type Viewpoint = {
    id: string,
    name: string,
    nLayers: number,
    forwardVector: Vector,
    xVector: Vector,
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