import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece, PieceId} from "~/lib/Piece.ts"
import {Form} from "~/lib/forms.ts"
import {Voxel} from "~/lib/Grid.ts"

export abstract class PieceGroup extends SerializableClass {
    label: string
    pieceIds: PieceId[]

    constructor() {
        super()
        this.label = "Piece Group"
        this.pieceIds = []
    }

    getForm(): Form {
        return {fields: [
            {
                type: "string",
                property: "label",
                label: "Label",
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
        _piecesInGroup: Piece[],
    ) {}
}

export class AssemblyPieceGroup extends PieceGroup {
    constructor() {
        super()
        this.label = "Assembly"
    }

    onPieceEdit(
        piece: Piece,
        addedVoxels: Voxel[],
        _removedVoxels: Voxel[],
        piecesInGroup: Piece[],
    ) {
        for(const pieceInGroup of piecesInGroup) {
            if(pieceInGroup.id === piece.id) { continue }
            pieceInGroup.removeVoxel(...addedVoxels)
        }
    }
}
registerClass(AssemblyPieceGroup)