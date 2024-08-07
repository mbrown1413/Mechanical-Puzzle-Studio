import {SerializableClass, clone, registerClass} from "~/lib/serialize.ts"
import {Grid, Bounds, Voxel, Transform} from "~/lib/Grid.ts"

export type PieceId = number
export type PieceInstanceId = number
export type PieceCompleteId = `${PieceId}` | `${PieceId}-${PieceInstanceId}`

/**
 * This type is just a list of pieces, but it conveys the intention of a set of
 * non-overlapping pieces placed in the same space, aka an assembly.
 */
export type Assembly = Piece[]

type AttributeValue = boolean

/**
 * Data as we store it when serialized. We'll read the types of Piece if
 * needed, but alternatively we turn some long lists into strings for more
 * efficient storage and better readability of the file format.
 */
type PieceStoredData = {
    voxels: Voxel[] | string
    bounds?: Bounds | string
}

export class Piece extends SerializableClass {
    id: PieceId
    instance?: PieceInstanceId
    voxels: Voxel[]
    voxelAttributes?: {
        [attribute: string]: {
            [voxel: Voxel]: AttributeValue
        }
    }

    bounds?: Bounds
    label?: string
    color?: string

    constructor(id: PieceId, voxels: Voxel[]=[]) {
        super()
        this.id = id
        this.voxels = voxels
    }

    static postSerialize(piece: Piece) {
        const stored = piece as unknown as PieceStoredData

        stored.voxels = piece.voxels.join("; ")
        if(piece.bounds) {
            stored.bounds = serializeBounds(piece.bounds)
        }
    }

    static preDeserialize(stored: PieceStoredData) {
        const pieceData: Piece = stored as unknown as Piece

        if(typeof stored.voxels === "string") {
            if(stored.voxels === "") {
                pieceData.voxels = []
            } else {
                pieceData.voxels = stored.voxels.split("; ")
            }
        }
        if(typeof stored.bounds !== "undefined") {
            pieceData.bounds = deserializeBounds(stored.bounds)
        }
    }

    /**
     * Complete ID is unique not only to this piece, but to this instance of
     * the piece. It includes the piece ID and the piece instance number.
     */
    get completeId(): PieceCompleteId {
        if(typeof this.instance === "number") {
            return `${this.id}-${this.instance}`
        } else {
            return `${this.id}`
        }
    }

    copy(): Piece {
        return clone(this)
    }

    equals(other: Piece): boolean {
        // Use sets so duplicate voxels don't affect equality
        const thisVoxels = new Set(this.voxels)
        const otherVoxels = new Set(other.voxels)
        if(
            thisVoxels.size !== otherVoxels.size ||
            [...thisVoxels].some(v => !otherVoxels.has(v))
        ) {
            return false
        }

        const thisAttrs = this.voxelAttributes || {}
        const otherAttrs = other.voxelAttributes || {}
        const attrNames = new Set([
            ...Object.keys(thisAttrs),
            ...Object.keys(otherAttrs)
        ])
        for(const attr of attrNames.keys()) {
            const thisVoxelValues = thisAttrs[attr] || {}
            const otherVoxelValues = otherAttrs[attr] || {}
            const voxels = new Set([
                ...Object.keys(thisVoxelValues),
                ...Object.keys(otherVoxelValues)
            ])
            for(const voxel of voxels.keys()) {
                if(!thisVoxels.has(voxel)) {
                    continue
                }

                const thisValue = thisVoxelValues[voxel]
                const otherValue = otherVoxelValues[voxel]
                if(thisValue !== otherValue) {
                    return false
                }
            }
        }

        return true
    }

    addVoxel(...toAdd: Voxel[]) {
        this.voxels = [...new Set(
            [...this.voxels, ...toAdd]
        )]
    }

    removeVoxel(...toRemove: Voxel[]) {
        this.voxels = this.voxels.filter(
            v => !toRemove.includes(v)
        )

        // Remove attributes of removed voxels
        for(const attrName of Object.keys(this.voxelAttributes || {})) {
            for(const voxel of toRemove) {
                this.unsetVoxelAttribute(attrName, voxel)
            }
        }
    }

    /** Mutates the piece by the given transform. */
    doTransform(grid: Grid, transform: Transform): this {
        const newVoxels = grid.doTransform(transform, this.voxels)
        const newPiece = new Piece(this.id, newVoxels)

        // Map old voxel attributes to their new voxels
        const attributes = this.listVoxelAttributes()
        for(let i=0; i<this.voxels.length; i++) {
            for(const attribute of attributes) {
                const value = this.getVoxelAttribute(attribute, this.voxels[i])
                newPiece.setVoxelAttribute(attribute, newPiece.voxels[i], value)
            }
        }

        this.voxels = newPiece.voxels
        this.voxelAttributes = newPiece.voxelAttributes
        return this
    }

    /**
     * Mutates the piece list by the given transform.
     */
    static transformAssembly(
        grid: Grid,
        pieces: Piece[],
        transform: Transform
    ): Piece[] {
        return pieces.map(piece => piece.doTransform(grid, transform))
    }

    getVoxelAttribute(attribute: string, voxel: Voxel): AttributeValue | undefined {
        if(this.voxelAttributes === undefined) { return undefined }
        if(this.voxelAttributes[attribute] === undefined) { return undefined }
        return this.voxelAttributes[attribute][voxel]
    }

    /**
     * Set attribute for the given voxel, or unset if value is undefined.
     */
    setVoxelAttribute(attribute: string, voxel: Voxel, value: AttributeValue | undefined) {
        if(value === undefined) {
            this.unsetVoxelAttribute(attribute, voxel)
            return
        }

        if(!this.voxels.includes(voxel)) {
            return
        }
        if(!this.voxelAttributes) {
            this.voxelAttributes = {}
        }
        if(!this.voxelAttributes[attribute]) {
            this.voxelAttributes[attribute] = {}
        }
        this.voxelAttributes[attribute][voxel] = value
    }

    unsetVoxelAttribute(attribute: string, voxel: Voxel) {
        if(this.voxelAttributes === undefined) { return }
        delete this.voxelAttributes[attribute][voxel]

        if(Object.keys(this.voxelAttributes[attribute]).length === 0) {
            delete this.voxelAttributes[attribute]

            if(Object.keys(this.voxelAttributes).length === 0) {
                this.voxelAttributes = undefined
            }
        }
    }

    listVoxelAttributes(): string[] {
        return Object.keys(this.voxelAttributes || {})
    }
}
registerClass(Piece)


function serializeBounds(bounds: Bounds): string {
    return Object.entries(bounds).map(
        ([key, value]) => `${key}:${value}`
    ).join(" ")
}

function deserializeBounds(serializedBounds: string | Bounds) {
    if(typeof serializedBounds !== "string") {
        return serializedBounds
    }
    const bounds: Bounds = {}
    for(const part of serializedBounds.split(" ")) {
        const [key, value] = part.split(":", 2)
        bounds[key] = Number(value)
    }
    return bounds
}