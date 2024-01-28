import {Bounds, Voxel, VoxelInfo, Dimension, Direction, Viewpoint, Orientation, Translation} from "~/lib/types.ts"
import {SerializableClass} from "~/lib/serialize.ts"

/**
 * Defines a set of voxels and the relation between them. This is the foundation
 * on which pieces are placed. Grid instances don't store data at each voxel,
 * they just define the information about the voxels themselves and the
 * relation between them.
 *
 * In technical terms, a grid is an undirected graph where each voxel is a
 * graph node and the ends of graph edges (the voxel's "sides") are labeled
 * with a direction. The location of a voxel is identified by the `Voxel` type,
 * which is an opaque datatype output by grids. Grids instances are typically
 * infinite, so some methods take a bounds argument which limits the space
 * which is considered.
 *
 * A simple example is a 2x2 rectangular grid. Each voxel may be identified by
 * an "x,y" value like so:
 *
 *     [
 *         "0,0", "1,0",
 *         "1,0", "1,1",
 *     ]
 *     
 * This may seem like an overly abstract data structure for something that
 * could be a simple two-dimensional array. However, having this general
 * interface allows us to create all sorts of irregular grids, and the code
 * which uses grids to create puzzles doesn't need to change. Thinking in terms
 * of graphs and not arrays will take some getting used to though.
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

    abstract isInBounds(voxel: Voxel, bounds: Bounds): Boolean
    
    getMaxBounds(...bounds: Bounds[]) {
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
    abstract getAdjacent(voxel: Voxel, direction: Direction): [Voxel|null, Direction]
    
    /**
     * Same as `getAdjacent()`, but adjacent voxels out of bounds are returned as null.
     */
    getAdjacentInBounds(voxel: Voxel, direction: Direction, bounds: Bounds): [Voxel|null, Direction] {
        let [neighbor, oppositeDir] = this.getAdjacent(voxel, direction)
        if(neighbor !== null && !this.isInBounds(neighbor, bounds)) {
            neighbor = null
        }
        return [neighbor, oppositeDir]
    }
  
    abstract getOrientations(): Orientation[]
    
    abstract translate(voxel: Voxel, translation: Translation): Voxel | null
    abstract getTranslation(from: Voxel, to: Voxel): Translation | null

    abstract getViewpoints(): Viewpoint[]
}