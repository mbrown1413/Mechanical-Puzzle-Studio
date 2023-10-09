
export type Size = Array<number>
export type Coordinate = Array<any>
export type Direction = string
export type Point = [number, number, number]

export type CellType = string

export type CellInfo = {
  coordinate: Coordinate,
  type: CellType,
  sides: Array<Direction>,
  sidePolygons: {[key: Direction]: Point[]}
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