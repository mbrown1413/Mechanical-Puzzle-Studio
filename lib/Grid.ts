import {Bounds, Coordinate, CellInfo, Dimension, Direction, Viewpoint, Orientation, Translation} from "~lib/types.ts"
import {SerializableClass} from "~lib/serialize.ts"

/**
 * Defines a set of cells and the relation between them. This is the foundation
 * on which pieces are placed.
 *
 * A grid can be thought of as an undirected graph where each cell is a node
 * and the edges between cells are labeled on each end with a direction. Cells
 * are identified by coordinates and also have a type, which corresponds to
 * their shape when made physically. Grids instances are typically infinite,
 * but some methods take a bounds argument which limits the space which is
 * considered.
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
export abstract class Grid extends SerializableClass {
    constructor(id: string|null = null) {
        super(id)
    }
    
    abstract getDimensions(): Dimension[]

    getDefaultPieceBounds(): Bounds {
        return this.getDimensions().map((dimension) => {
            if(!dimension.defaultBound) {
                throw "No default dimension size specified in grid"
            }
            return dimension.defaultBound
        })
    }

    abstract isInBounds(coordinate: Coordinate, bounds: Bounds): Boolean

    /**
     * Return info describing the cell at the given coordinate.
     */
    abstract getCellInfo(coordinate: Coordinate): CellInfo

    /**
     * Return the coordinate of all cells in the grid.
     */
    abstract getCoordinates(bounds: Bounds): Coordinate[]
  
    /**
     * Get coordinate next to the given coordinate in the given direction.
     * 
     * Although this may return coordinates which are out of any given bounds,
     * it may also return null if the grid is finite or irregular.
     * 
     * @return [
     *   The coordinate of the adjacent cell or null if there is no cell there,
     *   The opposite direction (the direction which will get back to the original cell)
     * ]
     */
    abstract getAdjacent(coordinate: Coordinate, direction: Direction): [Coordinate|null, Direction]
    
    /**
     * Same as `getAdjacent()`, but adjacent coordinates out of bounds are set to null.
     */
    getAdjacentInBounds(coordinate: Coordinate, direction: Direction, bounds: Bounds): [Coordinate|null, Direction] {
        let [neighbor, oppositeDir] = this.getAdjacent(coordinate, direction)
        if(neighbor !== null && !this.isInBounds(neighbor, bounds)) {
            neighbor = null
        }
        return [neighbor, oppositeDir]
    }
  
    abstract getOrientations(): Orientation[]
    
    abstract translate(coordinate: Coordinate, translation: Translation): Coordinate | null
    abstract getTranslation(from: Coordinate, to: Coordinate): Translation | null

    abstract getViewpoints(): Viewpoint[]
}