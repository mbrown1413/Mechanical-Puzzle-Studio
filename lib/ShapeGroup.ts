import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Shape} from "~/lib/Shape.ts"
import {Form} from "~/lib/forms.ts"
import {Voxel} from "~/lib/Grid.ts"

export type ShapeGroupId = number

type ShapeGroupStoredData = {
    shapes: Shape[]
    pieces?: Shape[] // Old name for backwards compatibility
}

export abstract class ShapeGroup extends SerializableClass {
    id: ShapeGroupId
    label: string
    shapes: Shape[]

    constructor(id: ShapeGroupId) {
        super()
        this.id = id
        this.label = "Shape Group"
        this.shapes = []
    }

    static preDeserialize(data: ShapeGroupStoredData) {
        // Backwards compatibility: convert old name for shapes
        if(data.pieces && data.shapes === undefined) {
            data.shapes = data.pieces
            delete data["pieces"]
        }
    }

    getForm(): Form {
        return {fields: [
            {
                type: "string",
                property: "label",
                label: "Name",
            },
        ]}
    }

    get canManuallyAddShapes() {
        return true
    }

    get displayCombined() {
        return true
    }

    onShapeEdit(
        _shape: Shape,
        _addedVoxels: Voxel[],
        _removedVoxels: Voxel[],
    ) {}
}

export class ShapeAssembly extends ShapeGroup {
    constructor(id: ShapeGroupId) {
        super(id)
        this.label = "Assembly"
    }

    onShapeEdit(
        shape: Shape,
        addedVoxels: Voxel[],
        _removedVoxels: Voxel[],
    ) {
        for(const shapeInGroup of this.shapes) {
            if(shapeInGroup.id === shape.id) { continue }
            shapeInGroup.removeVoxel(...addedVoxels)
        }
    }
}
registerClass(ShapeAssembly)
registerClass(ShapeAssembly, "PieceAssembly") // Old name for backwards compatibility