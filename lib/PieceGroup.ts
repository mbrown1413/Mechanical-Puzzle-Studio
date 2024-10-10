import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece} from "~/lib/Piece.ts"
import {Form} from "~/lib/forms.ts"
import {Voxel} from "~/lib/Grid.ts"

export type PieceGroupId = number

export abstract class PieceGroup extends SerializableClass {
    id: PieceGroupId
    label: string
    pieces: Piece[]

    constructor(id: PieceGroupId) {
        super()
        this.id = id
        this.label = "Piece Group"
        this.pieces = []
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

    get canManuallyAddPieces() {
        return true
    }

    get displayCombined() {
        return true
    }

    onPieceEdit(
        _piece: Piece,
        _addedVoxels: Voxel[],
        _removedVoxels: Voxel[],
    ) {}
}

export class PieceAssembly extends PieceGroup {
    constructor(id: PieceGroupId) {
        super(id)
        this.label = "Assembly"
    }

    onPieceEdit(
        piece: Piece,
        addedVoxels: Voxel[],
        _removedVoxels: Voxel[],
    ) {
        for(const pieceInGroup of this.pieces) {
            if(pieceInGroup.id === piece.id) { continue }
            pieceInGroup.removeVoxel(...addedVoxels)
        }
    }
}
registerClass(PieceAssembly)