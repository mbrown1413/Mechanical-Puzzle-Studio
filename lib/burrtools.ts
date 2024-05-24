import {parseStringPromise as parseXml} from "xml2js"

import {PuzzleFile} from "~/lib/PuzzleFile.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece} from "~/lib/Piece.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const KNOWN_GRIDTYPES: {[typeNum: string]: string} = {
    "0": "Brick",
    "1": "Triangular Prism",
    "2": "Spheres",
    "3": "Rhombic Tetrahedra",
    "4": "Tetra-Octahedra"
}

/* First 18 fixed colors BurrTools uses. */
const BURRTOOLS_COLORS = [
    "#0000FF", "#00FF00", "#FF0000",
    "#00FFFF", "#FFFF00", "#FF00FF",
    "#000099", "#009900", "#990000",
    "#009999", "#999900", "#990099",
    "#00FF99", "#99FF00", "#0099FF",
    "#9900FF", "#FF9900", "#FF0099",
]

type XmlRoot = {
    [rootName: string]: XmlNode
}

type XmlNode = {
    _?: string  // Inner text
    $?: Record<string, string>,  // Tag attributes
} & {
    [nestedTag: string]: XmlNode[]  // Nested tags
}

type BurrToolsFileReadResult = {
    puzzleFile: PuzzleFile,
    unsupportedFeatures?: string[]
}

/**
 * Read XML string into object structure suitable for passing to
 * `readBurrTools()`.
 */
export async function readXmlForBurrTools(
    stringContents: string
): Promise<XmlRoot> {
    return await parseXml(stringContents, {emptyTag: () => ({})})
}

/**
 * Read parsed BurrTools XML from `readXmlForBurrTools()` into a puzzle file.
 */
export async function readBurrTools(
    filename: string,
    xml: XmlRoot,
): Promise<BurrToolsFileReadResult> {
    const unsupportedFeatures: Set<string> = new Set()

    const rootTagName = Object.keys(xml)[0]
    if(rootTagName !== "puzzle") {
        throw new Error(
            `Malformatted BurrTools file: root xml element must be "puzzle", not "${rootTagName}"`
        )
    }
    if(xml.puzzle.$?.version === undefined) {
        throw new Error(
            "Malformatted BurrTools file: puzzle tag must have version attribute"
        )
    }
    if(xml.puzzle.$.version !== "2") {
        throw new Error(
            `Only BurrTools file format version 2 is supported, not version ${xml.puzzle.$.version}`
        )
    }

    const grid = readGrid(xml)

    const puzzleFile = new PuzzleFile(
        new Puzzle(grid),
        filename,
    )
    puzzleFile.createdUTCString = undefined
    puzzleFile.modifiedUTCString = undefined

    if(xml.puzzle.shapes.length !== 1) {
        throw new Error(`Expected one gridType definition, found ${xml.puzzle.shapes.length}`)
    }
    for(const shape of xml.puzzle.shapes[0].voxel || []) {
        const piece = readBtShape(puzzleFile.puzzle, shape, unsupportedFeatures)
        puzzleFile.puzzle.addPiece(piece)
    }

    if(xml.puzzle.problems.length !== 1) {
        throw new Error(`Expected one problems definition, found ${xml.puzzle.problems.length}`)
    }
    if((xml.puzzle.problems[0].problem || []).length > 0) {
        unsupportedFeatures.add("Problems")
    }

    emptyOrUnsupported(xml.puzzle, "colors", "Voxel colors", unsupportedFeatures)
    emptyOrUnsupported(xml.puzzle, "comment", "Comment", unsupportedFeatures)

    const result: BurrToolsFileReadResult = {puzzleFile}
    if(unsupportedFeatures.size > 0) {
        result.unsupportedFeatures = [...unsupportedFeatures]
    }
    return result
}

/**
 * Asserts that a tag is empty, or adds to the unsupported features list.
 */
function emptyOrUnsupported(node: XmlNode, tagName: string, featureName: string, unsupportedFeatures: Set<string>) {
    if(!(tagName in node)) { return }
    if(node[tagName].length > 1) {
        throw new Error(`Expected at most one ${tagName} definition, found ${node.colors.length}`)
    }
    if(Object.keys(node[tagName][0]).length !== 0) {
        unsupportedFeatures.add(featureName)
    }
}

function readGrid(xml: XmlRoot) {
    if(xml.puzzle.gridType.length !== 1) {
        throw new Error(`Expected one gridType definition, found ${xml.puzzle.gridType.length}`)
    }
    let gridType = String(xml.puzzle.gridType[0].$?.type)
    if(gridType !== "0") {
        if(gridType in KNOWN_GRIDTYPES) {
            gridType = KNOWN_GRIDTYPES[gridType]
        }
        throw new Error(`Unsupported BurrTools grid type: ${gridType}`)
    }
    return new CubicGrid()
}

function readBtShape(puzzle: Puzzle, shape: XmlNode, unsupportedFeatures: Set<string>): Piece {

    if((shape.$?.type || "0") !== "0") {
        throw new Error(`Unsupported BurrTools voxel type: ${shape.$?.type}`)
    }

    const xSize = Number(shape.$?.x) || 0
    const ySize = Number(shape.$?.y) || 0
    const zSize = Number(shape.$?.z) || 0
    if(
        typeof xSize !== "number" || xSize < 1 ||
        typeof ySize !== "number" || ySize < 1 ||
        typeof zSize !== "number" || zSize < 1
    ) {
        throw new Error("Malformed BurrTools file: voxel tag must have x, y, and z attributes as positive integers")
    }

    const piece = new Piece(puzzle.generatePieceId())
    piece.bounds = {xSize, ySize, zSize}

    if(shape.$?.name) {
        piece.label = shape.$.name
    } else {
        piece.label = `Piece ${puzzle.pieces.length + 1}`
    }

    let color = BURRTOOLS_COLORS[puzzle.pieces.length]
    if(color === undefined) {
        color = puzzle.getNewPieceColor()
    }
    piece.color = color

    if(shape.$?.weight) {
        unsupportedFeatures.add("Piece weights")
    }

    readVoxelString(
        shape._ || "",
        piece,
        xSize, ySize, zSize,
        unsupportedFeatures,
    )

    return piece
}

/**
 * Read a shape's voxels into the piece from the contents of the <voxel> tag.
 */
function readVoxelString(
    s: string,
    piece: Piece,
    xSize: number,
    ySize: number,
    zSize: number,
    unsupportedFeatures: Set<string>
) {
    // Voxel strings are always a list of voxels flattened from a 3-dimensional
    // cube. We expect there to be exactly xSize*ySize*zSize voxels in the
    // string. Each character in the string doesn't correspond to a voxel
    // though, since numbers can come after a voxel to specify its color.
    // 
    // Example: 2x2x2 grid with the upper (+Z) 4 voxels set:
    //
    //     ____####
    //
    // The "_" characters represent an unfilled voxel, while "#" represents
    // filled. To specify optional voxels, "+" is used:
    //
    //     ____++++
    //
    // To specify a voxel's color, numbers are given after the character for
    // that voxel. For example, to give voxel "0,0,1" the color "7":
    //
    //     ____+7+++

    let x=0, y=0, z=0
    function nextVoxel() {
        x++
        if(x >= xSize) { x = 0; y++ }
        if(y >= ySize) { y = 0; z++ }
    }

    const gridString: string = s || ""
    for(const char of gridString) {
        if(z >= zSize) {
            throw new Error("Malformed BurrTools file: too many characters in voxel space")
        }
        const voxel = `${x},${y},${z}`
        switch(char) {
            case "#":
                piece.voxels.push(voxel)
                nextVoxel()
            break
            case "+":
                piece.voxels.push(voxel)
                if(char === "+") {
                    piece.setVoxelAttribute("optional", voxel, true)
                }
                nextVoxel()
            break
            case "_":
                nextVoxel()
            break
            case "0": case "1": case "2": case "3": case "4":
            case "5": case "6": case "7": case "8": case "9":
                unsupportedFeatures.add("Voxel colors")
                break
            default:
                throw new Error(`Malformed BurrTools shape: Unrecognized voxel character: ${char}`)
        }

    }
    if(z < zSize) {
        throw new Error(`Malformed BurrTools file: not enough characters in voxel space`)
    }
}