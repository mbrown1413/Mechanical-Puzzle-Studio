import { Vector3 } from 'three'

/** 
 * Represents one cell in a `Grid`.
 * 
 * This should be treated as an opaque type by anything other than a `Grid`
 * implementation.
 */
export type Voxel = string

export type Bounds = Array<number>
export type Direction = string

export type Dimension = {
    name: string,
    defaultBound?: number,
}

export type VoxelShape = string

export type VoxelInfo = {
    voxel: Voxel,

    /* Corresponds to the voxel's shape when made physically. A voxel may "fit
    * into" another voxel only if the shapes match. */
    shape: VoxelShape,

    sides: Array<Direction>,
    sidePolygons: {[key: Direction]: Vector3[]}
}

export type Viewpoint = {
    id: string,
    name: string,
    forwardVector: Vector3,
    xVector: Vector3,
    getNLayers(bounds: Bounds): number,
    isInLayer(voxel: Voxel, layerIndex: number): boolean,
}

export type OrientationFunc = (oldVoxels: Voxel[]) => Voxel[] | null
export type Orientation = {
    orientationFunc: OrientationFunc
}

export type Translation = Array<number>

/* Stores a boolean, and an optional reason for its value. If `false`, the
 * reason is required. Used for success/failure return values. */
export type BoolWithReason = {
    bool: true
    reason?: string
} | {
    bool: false,
    reason: string
}

export type TaskCallbacks = {
    progressCallback: (percent: number) => void,
    logCallback: (message: string) => void,
}
export const voidTaskCallbacks: TaskCallbacks = {
    logCallback: (_message: string) => {},
    progressCallback: (_progressPercent: number) => {},
}
