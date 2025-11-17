import {PuzzleFile} from "~/lib/PuzzleFile.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

/**
 * Converts all pieces in the puzzle file to Puzzlecad.
 */
export function convertToPuzzlecad(puzzleFile: PuzzleFile): string {
    const grid = puzzleFile.puzzle.grid
    if(!(grid instanceof CubicGrid)) {
        throw new Error("Grid not compatible with Puzzlecad export");
    }

    let result = "/**\n"
    result += ` * ${puzzleFile.name}\n`
    result += ` * Exported from ${import.meta.env.VITE_APP_TITLE}\n`
    result += " */\n\n"
    result += "// Get Puzzlecad from:\n"
    result += "//   https://github.com/aaron-siegel/puzzlecad/releases\n"
    result += "//   https://www.puzzlehub.org/puzzlecad\n"
    result += "include <puzzlecad.scad>\n\n"
    result += "burr_plate([\n"

    for(const piece of puzzleFile.puzzle.pieces) {
        const bounds = grid.getVoxelBounds(piece.voxels)
        if(piece.label) {
            result += `    [  // ${piece.label}\n`
        } else {
            result += `    [\n`
        }

        for(let z = 0; z < bounds.zSize; z++) {
            result += "        \""
            for(let y = 0; y < bounds.ySize; y++) {
                for(let x = 0; x < bounds.xSize; x++) {
                    const voxel = grid.coordinateToVoxel({x, y, z})
                    if(piece.voxels.includes(voxel)) {
                        result += "x"
                    } else {
                        result += "."
                    }
                }
                if(y < bounds.ySize - 1) {
                    result += "|"
                }
            }
            result += '",\n'
        }

        result += "    ],\n"
    }

    result += "], $auto_layout=true);";
    return result;
}