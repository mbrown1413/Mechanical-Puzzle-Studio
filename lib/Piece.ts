import {SerializableClass, clone, registerClass} from "~/lib/serialize.ts"
import {Bounds, Voxel, Transform} from "~/lib/Grid.ts"

export type PieceId = number
export type PieceInstanceId = number
export type PieceCompleteId = `${PieceId}` | `${PieceId}-${PieceInstanceId}`

export type PieceWithId = Piece & {id: PieceId}

type AttributeValue = boolean

export class Piece extends SerializableClass {
    id: PieceId | null
    instance?: PieceInstanceId

    bounds: Bounds
    voxels: Voxel[]
    label: string
    color: string

    voxelAttributes?: {
        [attribute: string]: {
            [voxel: Voxel]: AttributeValue
        }
    }

    constructor(id: PieceId | null, bounds: Bounds, voxels: Voxel[]=[]) {
        super()
        this.id = id
        this.bounds = bounds
        this.voxels = voxels
        this.label = id === null ? "unlabeled-piece" : `Piece ${id}`
        this.color = "#00ff00"
        this.voxelAttributes = undefined
    }

    hasId(): this is PieceWithId {
        return typeof this.id === "number"
    }

    /**
     * Complete ID is unique not only to this piece, but to this instance of
     * the piece. It includes the piece ID and the piece instance number.
     */
    get completeId(): PieceCompleteId | null {
        if(this.id === null) {
            return null
        }
        if(typeof this.instance === "number") {
            return `${this.id}-${this.instance}`
        } else {
            return `${this.id}`
        }
    }

    copy(): Piece {
        const coppied = clone(this)
        coppied.id = null
        coppied.instance = undefined
        return coppied
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

    transform(transform: Transform): this {
        const newVoxels = transform.mapVoxels(this.voxels)

        // Transform attributes based map of old to new voxels
        const newAttrs: {
            [attribute: string]: {
                [voxel: Voxel]: AttributeValue
            }
        } = {}
        for(const [attrName, attrValues] of Object.entries(this.voxelAttributes || {})) {
            newAttrs[attrName] = {}
            for(const [voxel, value] of Object.entries(attrValues)) {
                const voxelIdx = this.voxels.indexOf(voxel)
                if(voxelIdx === -1) {
                    continue
                }
                const newVoxel = newVoxels[voxelIdx]
                newAttrs[attrName][newVoxel] = value
            }
        }
        this.voxelAttributes = newAttrs

        this.voxels = newVoxels
        return this
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
}

registerClass(Piece)