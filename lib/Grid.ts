import * as THREE from "three"
import {Vector3} from "three"

import {SerializableClass} from "~/lib/serialize.ts"

/**
 * Represents one cell in a `Grid`.
 *
 * This should be treated as an opaque type by anything other than a `Grid`
 * implementation, that is, you should never count on the voxel values being
 * meaningful. However, under the hood, `Voxel` is actually just a string, so
 * you can use it as keys datatypes like `Set` or `Map`.
 *
 * Grids should not use "\n" or ";" characters in voxel values. This allows
 * algorithms using grids to manipulate lists of voxels in various ways.
 */
export type Voxel = string

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
    sides: Direction[],
}

export type SideInfo = {
    solid: THREE.BufferGeometry,
    wireframe: Vector3[],  // List of points in a line-loop
}

export type PieceBoundsEditInfo = {
    dimensions: {
        /** Name to show in UI for this dimension. */
        name: string,
        /** Property on Bounds object that should be edited for this dimension. */
        boundsProperty: string,
    }[]
}

/**
 * Represents a smaller area within the full grid.
 */
export type Bounds = {[key: string]: number}

/**
 * A UI construct representing a useful perspective from which to view the
 * grid. Each viewpoint also breaks the grid into layers, generally orthogonal
 * to the camera, to easily view and edit pieces.
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
 * Represents a mapping of one set of voxels to another.
 *
 * Each voxel in the output should correspond to the voxel at the same position
 * in the input array.
 */
export type Transform = string

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

    /** User-facing name for this type of grid. */
    static get gridTypeName() { return "Unnamed Grid Type" }

    /** User-facing description for this type of grid. */
    static get gridTypeDescription() { return "" }

    /** Return a reasonable bounds size to use for a piece. */
    abstract getDefaultPieceBounds(): Bounds

    /** Information about how to edit the bounds for a piece. */
    abstract get boundsEditInfo(): PieceBoundsEditInfo

    /** Is the given voxel inside the bounds? */
    abstract isInBounds(voxel: Voxel, bounds: Bounds): boolean

    /** Returns the smallest bounds which contains all of the given voxels. */
    abstract getVoxelBounds(...voxels: Voxel[]): Bounds

    /** Returns the smallest bounds which contains all of the given bounds. */
    abstract getBoundsMax(...bounds: Bounds[]): Bounds

    /**
     * Returns the origin of a given bounds. The origin will typically be the
     * voxel closest to a grid's global origin, although this may vary by
     * implementation.
     */
    abstract getBoundsOrigin(bounds: Bounds): Voxel

    /** Return info describing the voxel. */
    abstract getVoxelInfo(voxel: Voxel): VoxelInfo

    /** Return all voxels in the grid inside the bounds. */
    abstract getVoxels(bounds: Bounds): Voxel[]

    /** Return info describing one side of a voxel. */
    abstract getSideInfo(voxel: Voxel, direction: Direction): SideInfo

    /**
     * Perform a transformation, mapping an existing set of voxels to a new set
     * of the same size.
     *
     * The position of returned voxels correspond one-to-one to voxels from the
     * input. In addition, each voxel's mapping must not depend on any other
     * voxels in the list. So for example, a rotation transformation must
     * always rotate about the same axis without normalizing the result to be
     * centered around an origin.
     * 
     * Note that this just transforms the voxels. To transform a whole piece
     * and account for things like voxel attributes, use `Piece.transform()`.
     */
    abstract doTransform(transform: Transform, voxels: Voxel[]): Voxel[]

    /**
     * Return the transform which repeats the given transform `amount` times.
     * Amount will always be an integer but it may be negative, indicating the
     * transform should be done in the opposite direction.
     */
    abstract scaleTransform(transform: Transform, amount: number): Transform

    /** List all possible ways a set of voxels can be rotated. */
    abstract getRotations(includeMirrors: boolean): Transform[]

    /** Return a translation which would move one voxel to another. */
    abstract getTranslation(from: Voxel, to: Voxel): Transform

    /** Get transforms which should be used as movements when disassembling. */
    abstract getDisassemblyTransforms(): Transform[]

    /** Are the two groups of voxels trivially separable from each other? */
    abstract isSeparate(group1: Voxel[], group2: Voxel[]): boolean

    /** Get a list of viewpoints which the user can switch between. */
    abstract getViewpoints(): Viewpoint[]
}