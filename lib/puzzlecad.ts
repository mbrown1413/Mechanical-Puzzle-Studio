import {PuzzleFile} from "~/lib/PuzzleFile.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

/**
 * Converts all shapes in the puzzle file to Puzzlecad.
 */
export function convertToPuzzlecad(puzzleName: string, puzzleFile: PuzzleFile): string {
    const grid = puzzleFile.puzzle.grid
    if(!(grid instanceof CubicGrid)) {
        throw new Error("Grid not compatible with Puzzlecad export");
    }

    let result = "/**\n"
    result += ` * ${puzzleName}\n`
    result += ` * Exported from ${import.meta.env.PZS_APP_TITLE}\n`
    result += " */\n\n"
    result += "// Get Puzzlecad from:\n"
    result += "//   https://github.com/aaron-siegel/puzzlecad/releases\n"
    result += "//   https://www.puzzlehub.org/puzzlecad\n"
    result += "include <puzzlecad.scad>\n\n"
    result += "burr_plate([\n"

    for(const shape of puzzleFile.puzzle.shapes) {
        const bounds = grid.getVoxelBounds(shape.voxels)
        if(shape.label) {
            result += `    [  // ${shape.label}\n`
        } else {
            result += `    [\n`
        }

        const xFirst = bounds.x || 0;
        const yFirst = bounds.y || 0;
        const zFirst = bounds.z || 0;
        const xLast = xFirst + bounds.xSize - 1
        const yLast = yFirst + bounds.ySize - 1
        const zLast = zFirst + bounds.zSize - 1

        for(let z=zFirst; z <= zLast; z++) {
            result += "        \""
            for(let y=yFirst; y <= yLast; y++) {
                for(let x=xFirst; x <= xLast; x++) {
                    const voxel = grid.coordinateToVoxel({x, y, z})
                    if(shape.voxels.includes(voxel)) {
                        result += "x"
                    } else {
                        result += "."
                    }
                }
                if(y < yLast) {
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