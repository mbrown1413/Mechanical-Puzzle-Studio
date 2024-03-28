import {SerializableClass, deserialize, registerClass, serialize} from "~/lib/serialize.ts"
import {Bounds, Voxel, Transform} from "~/lib/Grid.ts"

export type PieceWithId = Piece & {id: string}

type AttributeValue = boolean

export class Piece extends SerializableClass {
    id: string | null

    bounds: Bounds
    voxels: Voxel[]
    label: string
    color: string

    voxelAttributes?: {
        [attribute: string]: {
            [voxel: Voxel]: AttributeValue
        }
    }

    constructor(id: string | null, bounds: Bounds, voxels: Voxel[]=[]) {
        super()
        this.id = id
        this.bounds = bounds
        this.voxels = voxels
        this.label = id || "unlabeled-piece"
        this.color = "#00ff00"
        this.voxelAttributes = undefined
    }

    hasId(): this is PieceWithId {
        return typeof this.id === "string"
    }

    copy(): Piece {
        const coppied = deserialize<Piece>(serialize(this), "Piece")
        coppied.id = null
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

    setVoxelAttribute(attribute: string, voxel: Voxel, value: AttributeValue) {
        if(!this.voxelAttributes) {
            this.voxelAttributes = {}
        }
        if(!this.voxelAttributes[attribute]) {
            this.voxelAttributes[attribute] = {}
        }
        this.voxelAttributes[attribute][voxel] = value
    }
}

registerClass(Piece)