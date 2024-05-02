import {registerClass} from '~/lib/serialize.ts'
import {CubicBounds, CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {Piece, PieceWithId} from '~/lib/Piece.ts'

export class SquareGrid extends CubicGrid {

    getVoxels(bounds: CubicBounds) {
        const ret = []
        const xMin = bounds.x || 0
        const yMin = bounds.y || 0
        const xMax = xMin + bounds.xSize
        const yMax = yMin + bounds.ySize
        for(let x=xMin; x < xMax; x++) {
            for(let y=yMin; y < yMax; y++) {
                ret.push(this.coordinateToVoxel({x, y, z: 0}))
            }
        }
        return ret
    }

    getRotations() {
        return [
            "r:+X,0", "r:+X,2",
            "r:-X,0", "r:-X,2",
            "r:+Y,0", "r:+Y,2",
            "r:-Y,0", "r:-Y,2",
        ]
    }

    getViewpoints() {
        let viewpoints = CubicGrid.prototype.getViewpoints.call(this)
        viewpoints = viewpoints.filter(
            viewpoint => viewpoint.id === "xy"
        )
        for(const viewpoint of viewpoints) {
            viewpoint.getNLayers = () => 1
        }
        return viewpoints
    }

    getDisassemblyTransforms() {
        return [
            this.getTranslation("0,0,0", "1,0,0"),
            this.getTranslation("0,0,0", "-1,0,0"),
            this.getTranslation("0,0,0", "0,1,0"),
            this.getTranslation("0,0,0", "0,-1,0"),
        ]
    }

    /**
     * Produce a set of pieces from a string representation.
     * 
     * Each character represents a voxel. A number 0-9 is an ID of the piece in
     * that voxel. The following characters represent a voxel without a piece:
     * ".", "-", " "
     *
     * For example:
     *
     *     grid.piecesFromString(`
     *         000
     *         1.0
     *         111
     *     `)
     */
    piecesFromString(layoutString: string): PieceWithId[] {
        const pieces: {[id: number]: PieceWithId} = {}
        for(const [y, line] of layoutString.split("\n").entries()) {
            for(let x=0; x<line.length; x++) {
                const char = line[x]
                if(char === " " || char === "." || char === "-") {
                    continue
                }

                const id = Number(line[x])
                if(isNaN(id)) {
                    throw new Error(`Unexpected non-number ID: ${line[x]}`)
                }

                const piece = pieces[id] || new Piece(id)
                pieces[id] = piece
                piece.addVoxel(`${x},-${y},0`)
            }
        }

        // Translate all pieces so the bounds is 0,0
        const bounds = this.getBoundsMax(
            ...Object.values(pieces).map(
                p => this.getVoxelBounds(...p.voxels)
            )
        )
        const translation = this.getTranslation(
            this.coordinateToVoxel(
                {x: bounds.x || 0, y: bounds.y || 0, z: bounds.z || 0}
            ), 
            "0,0,0"
        )
        for(const piece of Object.values(pieces)) {
            piece.transform(this, translation)
        }

        return Object.values(pieces)
    }
}

registerClass(SquareGrid)