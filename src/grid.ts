import { Size, Coordinate, CellInfo, Direction, Viewpoint } from "./types.ts"

/**
 * Defines a set of cells and the relation between them. This is the foundation
 * on which pieces are placed.
 *
 * A grid can be thought of as an undirected graph where each cell is a node
 * and the edges between cells are labeled on each end with a direction. Cells
 * are identified by coordinates and also have a type, which corresponds to
 * their shape when made physically (in jigsaws, this determines which pieces
 * can fit into this shape).
 *
 * A simple example is a 2x2 rectangular grid. Each cell may be identified by
 * a (x, y) coordinate like so:
 *
 *     (0, 0), (1, 0),
 *     (1, 0), (1, 1),
 *     
 * This may seem like an abstract definition for something that could be
 * described as a simple data array. However, having this general interface
 * allows us to create all sorts of irregular grids, and the code which uses
 * grids to create puzzles doesn't need to change. Thinking in terms of graphs
 * and not arrays will take some getting used to though.
 */
export abstract class Grid {
  abstract size: Size

  /**
   * Return info describing the cell at the given coordinate.
   */
  abstract getCellInfo(coordinate: Coordinate): CellInfo

  /**
   * Return the coordinate of all cells in the grid.
   */
  abstract getCoordinates(): Coordinate[]
  
  /**
   * Get coordinate next to the given coordinate in the given direction.
   * 
   * @return [
   *   The coordinate of the adjacent cell or null if there is no cell there,
   *   The opposite direction (the direction which will get back to the original cell)
   * ]
   */
  abstract getAdjacent(coordinate: Coordinate, direction: Direction): [Coordinate|null, Direction]
  
  /**
   * Get all possible cell types which may appear in this grid.
   */
  //abstract getCellTypes(): Iterable<CellType>
  
  /**
   * Get transforms which can be applied to the given cell type.
   */
  //abstract getTransforms(cellType: CellType): Iterable<Transform>
  
  //abstract applyTransform(cellType: CellType, transform: Transform): CellInfo

  abstract getViewpoints(): Viewpoint[]
  
  abstract getViewpointLayer(viewpointId: string, layerNumber: number): Coordinate[]
}