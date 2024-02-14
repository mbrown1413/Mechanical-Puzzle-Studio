import {Vector3} from "three"

import {SerializableClass} from "~/lib/serialize.ts"

/**
 * Represents one cell in a `Grid`.
 *
 * This should be treated as an opaque type by anything other than a `Grid`
 * implementation, that is, you should never count on the voxel values being
 * meaningful. However, under the hood, `Voxel` is actually just a string, so
 * you can use it as keys datatypes like `Set` or `Map`.
 */
export type Voxel = string

/**
 * A voxel's shape when made physically. A voxel may "fit into" another voxel
 * only if the shapes match.
 */
export type VoxelShape = string

/**
 * The connections from one voxel to another are tagged with a direction,
 * indicating where they are in relation to each other. Opposite sides of each
 * connection will be tagged with "opposite" directions.
 *
 * Like `Voxel`, you should consider this as an opaque datatype except for the
 * fact that it can be used as keys for datatypes like `Set` or `Map`.
 */
export type Direction = string

export type VoxelInfo = {
    voxel: Voxel,
    shape: VoxelShape,
    sides: Direction[],

    /**
     * Drawing information for each side. Each side must have an entry
     * specifying the polygon to draw as a list of points in a line-loop.
     */
    sidePolygons: {[key: Direction]: Vector3[]}
}

/**
 * An "axis" of the grid.
 *
 * Dimensions are mostly informational, used to display and edit bounds. The
 * number of dimensions in a puzzle must be the same as the number of elements
 * in the grid's bounds. While a grid's dimensions give information on what the
 * grid's bounds values look like, it doesn't necessarily have anything to do
 * with the voxel values themselves.
 */
export type Dimension = {
    name: string,
    defaultBound?: number,
}

/**
 * Represents a smaller area within the full grid.
 */
export type Bounds = number[]

/**
 * A UI construct representing a useful perspective from which to view the
 * grid. Each viewpoint also breaks the grid into layers, generally orthogonal
 * to the camera, to easily view and edit pieces.
 *
 * Note that viewpoints do not necessarily correspond to a `Dimension` or
 * `Direction`.
 */
export type Viewpoint = {
    id: string,
    name: string,

    /**
     * The direction for the camera to point.
     */
    forwardVector: Vector3,

    /**
     * The orientation for the camera, specified as the direction which should
     * be +X (to the right) in screen-space.
     */
    xVector: Vector3,

    getNLayers(bounds: Bounds): number,
    isInLayer(voxel: Voxel, layerIndex: number): boolean,
}

/**
 * A transformation of voxels by rotating about some point in space.
 */
export type Orientation = {
    orientationFunc: (oldVoxels: Voxel[]) => Voxel[] | null
}

/**
 * Represents a movement, without rotation, from one place in the grid to
 * another.
 */
export type Translation = number[]

/**
 * Defines a set of voxels and the relation between them. This is the foundation
 * on which pieces are placed. Grid instances don't store data at each voxel,
 * they just define the information about the voxels themselves and the
 * relation between them.
 *
 * In technical terms, a grid is an undirected graph where each voxel is a
 * graph node and the ends of graph edges (the voxel's "sides") are labeled
 * with a direction. Grids instances are typically infinite, so some methods
 * take a bounds argument which limits the space which is considered.
 *
 * A simple grid example is a 2x2 rectangular grid. Each voxel may be
 * identified by an "x,y" value like so:
 *
 *     [
 *         "0,0", "1,0",
 *         "1,0", "1,1",
 *     ]
 *
 * Notice that's a flat list, just formatted nicely to make it look like a 2x2
 * shape. This may seem like an overly abstract data structure for something
 * that could be a simple two-dimensional array. However, having this general
 * interface allows us to create all sorts of irregular grids, and the code
 * which uses grids to create puzzles doesn't need to change. Thinking in terms
 * of graphs and not arrays will take some getting used to though.
 */
export abstract class Grid extends SerializableClass {

    abstract getDimensions(): Dimension[]

    /**
     * Return a reasonable bounds size to use for a piece.
     *
     * The default implementation which uses information from `getDimensions()`
     * should work fine in most cases.
     */
    getDefaultPieceBounds(): Bounds {
        return this.getDimensions().map((dimension) => {
            if(!dimension.defaultBound) {
                throw new Error("No default dimension size specified in grid")
            }
            return dimension.defaultBound
        })
    }

    /**
     * Is the given voxel inside the bounds?
     */
    abstract isInBounds(voxel: Voxel, bounds: Bounds): boolean

    /**
     * Returns the smallest bounds which contains all of the given bounds.
     */
    getMaxBounds(...bounds: Bounds[]): Bounds {
        if(bounds.length === 0) {
            return this.getDefaultPieceBounds()
        }
        return bounds.reduce(
            (accumulator, currentValue) => accumulator.map(
                (boundsPart, i) => Math.max(boundsPart, currentValue[i]),
            )
        )
    }

    /**
     * Return info describing the voxel.
     */
    abstract getVoxelInfo(voxel: Voxel): VoxelInfo

    /**
     * Return all voxels in the grid inside the bounds.
     */
    abstract getVoxels(bounds: Bounds): Voxel[]

    /**
     * Get voxel next to the given voxel in the given direction.
     *
     * Even though no bounds are passed in, this method may still return null
     * if the grid is finite or irregular.
     *
     * @return [
     *   The adjacent voxel or null if there is no voxel there,
     *   The opposite direction (the direction which will get back to the original voxel)
     * ]
     */
    abstract getAdjacent(
        voxel: Voxel,
        direction: Direction
    ): [neighbor: Voxel|null, oppositeDirection: Direction]

    /**
     * Same as `getAdjacent()`, but adjacent voxels out of bounds are returned as null.
     */
    getAdjacentInBounds(voxel: Voxel, direction: Direction, bounds: Bounds): [Voxel|null, Direction] {
        const [neighbor, oppositeDir] = this.getAdjacent(voxel, direction)
        if(neighbor !== null && !this.isInBounds(neighbor, bounds)) {
            return [null, oppositeDir]
        } else {
            return [neighbor, oppositeDir]
        }
    }

    /**
     * List all possible ways a set of voxels can be rotated.
     */
    abstract getOrientations(): Orientation[]

    /**
     * Return a translation which would move one voxel to another, or null if
     * no translation exists.
     */
    abstract getTranslation(from: Voxel, to: Voxel): Translation | null

    /**
     * Apply translation to a voxel, or null if the transformation cannot be
     * applied.
     */
    abstract translate(voxel: Voxel, translation: Translation): Voxel | null

    abstract getViewpoints(): Viewpoint[]
}