import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece, PieceId} from "~/lib/Piece.ts"
import {Form} from "~/lib/forms.ts"
import {Voxel} from "~/lib/Grid.ts"

export type PieceGroupId = number

export abstract class PieceGroup extends SerializableClass {
    id: PieceGroupId
    label: string
    pieceIds: PieceId[]

    constructor(id: PieceGroupId) {
        super()
        this.id = id
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
    constructor(id: PieceGroupId) {
        super(id)
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