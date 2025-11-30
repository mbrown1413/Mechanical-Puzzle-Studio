import {SerializableClass, clone, registerClass} from "~/lib/serialize.ts"
import {Grid, Bounds, Voxel, Transform} from "~/lib/Grid.ts"
import {Form, FormEditable} from "~/lib/forms.ts"

export type ShapeId = number
export type ShapeInstanceId = number
export type ShapeCompleteId = `${ShapeId}` | `${ShapeId}-${ShapeInstanceId}`

/**
 * This type is just a list of shapes, but it conveys the intention of a set of
 * non-overlapping shapes placed in the same space, aka an assembly.
 */
export type Assembly = Shape[]

type AttributeValue = boolean

/**
 * Data as we store it when serialized. We'll read the types of Shape if
 * needed, but alternatively we turn some long lists into strings for more
 * efficient storage and better readability of the file format.
 */
type ShapeStoredData = {
    voxels: Voxel[] | string
    bounds?: Bounds | string
}

/**
 * A shape is a set of voxels on a grid, plus other metadata. Each voxel may
 * also have arbitrary attributes.
 *
 * When used in a problem, each shape may have multiple instances. In this
 * case, the term "piece" may be used and the `instance` attribute will be set
 * to distinguish multiple uses of the same shape.
 */
export class Shape extends SerializableClass implements FormEditable{
    id: ShapeId
    instance?: ShapeInstanceId
    voxels: Voxel[]
    voxelAttributes?: {
        [attribute: string]: {
            [voxel: Voxel]: AttributeValue
        }
    }

    bounds?: Bounds
    label?: string
    color?: string

    constructor(id: ShapeId, voxels: Voxel[]=[]) {
        super()
        this.id = id
        this.voxels = voxels
    }

    static postSerialize(shape: Shape) {
        const stored = shape as unknown as ShapeStoredData

        stored.voxels = shape.voxels.join("; ")
        if(shape.bounds) {
            stored.bounds = serializeBounds(shape.bounds)
        }
    }

    static preDeserialize(stored: ShapeStoredData) {
        const shapeData: Shape = stored as unknown as Shape

        if(typeof stored.voxels === "string") {
            if(stored.voxels === "") {
                shapeData.voxels = []
            } else {
                shapeData.voxels = stored.voxels.split("; ")
            }
        }
        if(typeof stored.bounds !== "undefined") {
            shapeData.bounds = deserializeBounds(stored.bounds)
        }
    }

    getForm(): Form {
        return {
            fields: [
                {
                    type: "string",
                    property: "label",
                    label: "Name",
                },
                {
                    type: "bounds",
                    property: "bounds",
                },
                {
                    type: "color",
                    property: "color",
                    label: "Color",
                },
            ]
        }
    }

    /**
     * Complete ID is unique not only to this shape, but to this instance of
     * the shape. It includes the shape ID and the shape instance number.
     */
    get completeId(): ShapeCompleteId {
        if(typeof this.instance === "number") {
            return `${this.id}-${this.instance}`
        } else {
            return `${this.id}`
        }
    }

    copy(): Shape {
        return clone(this)
    }

    equals(other: Shape): boolean {
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

    /** Mutates the shape by the given transform. */
    doTransform(grid: Grid, transform: Transform): this {
        const newVoxels = grid.doTransform(transform, this.voxels)
        const newShape = new Shape(this.id, newVoxels)

        // Map old voxel attributes to their new voxels
        const attributes = this.listVoxelAttributes()
        for(let i=0; i<this.voxels.length; i++) {
            for(const attribute of attributes) {
                const value = this.getVoxelAttribute(attribute, this.voxels[i])
                newShape.setVoxelAttribute(attribute, newShape.voxels[i], value)
            }
        }

        this.voxels = newShape.voxels
        this.voxelAttributes = newShape.voxelAttributes
        return this
    }

    /**
     * Mutates the shape list by the given transform.
     */
    static transformAssembly(
        grid: Grid,
        shapes: Shape[],
        transform: Transform
    ): Shape[] {
        return shapes.map(shape => shape.doTransform(grid, transform))
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
registerClass(Shape)
registerClass(Shape, "Piece")  // Backwards compatibility


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