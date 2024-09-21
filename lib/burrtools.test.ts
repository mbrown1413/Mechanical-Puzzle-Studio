import {test, expect, describe} from "vitest"

import {serialize} from "~/lib/serialize.ts"
import {readBurrTools, readXmlForBurrTools} from "./burrtools.ts"

describe("burrtools read", () => {

    test("xml error", () => {
        expect(
            readXmlForBurrTools('<foo><b<a<>')
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
          [Error: Invalid character in tag name
          Line: 0
          Column: 8
          Char: <]
        `)
    })

    test("xml but not a puzzle", async () => {
        const xml = await readXmlForBurrTools('<foo></foo>')
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformatted BurrTools file: root xml element must be "puzzle", not "foo"]`)
    })

    test("unsupported version", async () => {
        let xml = await readXmlForBurrTools('<puzzle version="3"></puzzle>')
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Only BurrTools file format version 2 is supported, not version 3]`)

        xml = await readXmlForBurrTools('<puzzle></puzzle>')
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformatted BurrTools file: puzzle tag must have version attribute]`)
    })

    test("blank puzzle", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems/>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {},
                "pieces": [],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("unsupported grid", async () => {
        let xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
            <gridType type="1"/>
            <colors/>
            <shapes/>
            <problems/>
            <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Unsupported BurrTools grid type: Triangular Prism]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
            <gridType type="A"/>
            <colors/>
            <shapes/>
            <problems/>
            <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Unsupported BurrTools grid type: A]`)
    })

    test("piece voxels", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="3" z="4" type="0">#__#_______#___________#</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:3 zSize:4",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "0,0,0; 1,1,0; 1,2,1; 1,2,3",
                  },
                ],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("voxel type unsupported", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="3" z="4" type="1">#__#_______#___________#</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Unsupported BurrTools voxel type: 1]`)
    })

    test("piece label", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" name="This is a piece label!" type="0">________</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "This is a piece label!",
                    "type": "Piece",
                    "voxels": "",
                  },
                ],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("pieces with optional voxels", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="5" y="4" z="3" type="0">##___##_____________++___++_________________________________</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:5 ySize:4 zSize:3",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxelAttributes": {
                      "optional": {
                        "0,0,1": true,
                        "0,1,1": true,
                        "1,0,1": true,
                        "1,1,1": true,
                      },
                    },
                    "voxels": "0,0,0; 1,0,0; 0,1,0; 1,1,0; 0,0,1; 1,0,1; 0,1,1; 1,1,1",
                  },
                ],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("malformed pieces", async () => {
        let xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">_______</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: not enough characters in voxel space]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">_________</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: too many characters in voxel space]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">__!_____</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools shape: Unrecognized voxel character: !]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" type="0">________</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: voxel tag must have x, y, and z attributes as positive integers]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="A" type="0">________</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: voxel tag must have x, y, and z attributes as positive integers]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="0" type="0">________</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: voxel tag must have x, y, and z attributes as positive integers]`)
    })

    test("colors unsupported", async () => {
        let xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">____#7___</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        let puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "0,0,1",
                  },
                ],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Voxel colors",
            ],
          }
        `)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors>
                  <color red="0" green="128" blue="27"/>
                </colors>
                <shapes/>
                <problems/>
                <comment/>
            </puzzle>
        `)
        puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {},
                "pieces": [],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Voxel colors",
            ],
          }
        `)
    })

    test("piece weights unsupported", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" weight="3" type="0">____#___</voxel>
                </shapes>
                <problems/>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "0,0,1",
                  },
                ],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Piece weights",
            ],
          }
        `)
    })

    test("problem", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                </shapes>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape id="1" count="1"/>
                            <shape id="2" count="2"/>
                        </shapes>
                        <result id="0"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 3,
                  "problem": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "",
                  },
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#00FF00",
                    "id": 1,
                    "label": "Piece 2",
                    "type": "Piece",
                    "voxels": "",
                  },
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#FF0000",
                    "id": 2,
                    "label": "Piece 3",
                    "type": "Piece",
                    "voxels": "",
                  },
                ],
                "problems": [
                  {
                    "disassemble": false,
                    "goalPieceId": 0,
                    "id": 0,
                    "label": "Problem 1",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {
                      "1": 1,
                      "2": 2,
                    },
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("empty problem", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems>
                    <problem state="0">
                        <shapes/>
                        <result id="4294967295"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "problem": 1,
                },
                "pieces": [],
                "problems": [
                  {
                    "disassemble": false,
                    "id": 0,
                    "label": "Problem 1",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {},
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("malformed problems", async () => {
        let xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems>
                    <problem/>
                </problems>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Expected one shapes definition in problem, found 0]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape id="-1" count="1"/>
                        </shapes>
                        <result id="0"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: Problem shape id must be a positive integer, not "-1"]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape count="1"/>
                        </shapes>
                        <result id="0"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: Problem shape missing id]`)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                </shapes>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape id="0"/>
                        </shapes>
                        <result id="0"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        expect(
            readBurrTools("puzzle.xmpuzzle", xml)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformed BurrTools file: Expected problem shape to have either count, or min and max attributes.]`)
    })

    test("problem label", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems>
                    <problem name="Problem 1 label!" state="0">
                        <shapes/>
                        <result id="4294967295"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "problem": 1,
                },
                "pieces": [],
                "problems": [
                  {
                    "disassemble": false,
                    "id": 0,
                    "label": "Problem 1 label!",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {},
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("piece min/max", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                </shapes>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape id="1" min="4" max="5"/>
                        </shapes>
                        <result id="0"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 2,
                  "problem": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "",
                  },
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#00FF00",
                    "id": 1,
                    "label": "Piece 2",
                    "type": "Piece",
                    "voxels": "",
                  },
                ],
                "problems": [
                  {
                    "disassemble": false,
                    "goalPieceId": 0,
                    "id": 0,
                    "label": "Problem 1",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {
                      "1": {
                        "max": 5,
                        "min": 4,
                      },
                    },
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("piece group unsupported", async () => {
        let xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                </shapes>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape id="0" count="1" group="2"/>
                        </shapes>
                        <result id="4294967295"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        let puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                  "problem": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "",
                  },
                ],
                "problems": [
                  {
                    "disassemble": false,
                    "id": 0,
                    "label": "Problem 1",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {
                      "0": 1,
                    },
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Piece groups",
            ],
          }
        `)

        xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="2" y="2" z="2" type="0">________</voxel>
                </shapes>
                <problems>
                    <problem state="0">
                        <shapes>
                            <shape id="0" count="1">
                                <group group="1" count="1"/>
                                <group group="2" count="1"/>
                            </shape>
                        </shapes>
                        <result id="4294967295"/>
                        <bitmap/>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 1,
                  "problem": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:2 ySize:2 zSize:2",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "",
                  },
                ],
                "problems": [
                  {
                    "disassemble": false,
                    "id": 0,
                    "label": "Problem 1",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {
                      "0": 1,
                    },
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Piece groups",
            ],
          }
        `)
    })

    test("solutions unsupported", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes>
                    <voxel x="1" y="1" z="1" type="0">#</voxel>
                    <voxel x="1" y="1" z="1" type="0">#</voxel>
                </shapes>
                <problems>
                    <problem state="2" assemblies="1" solutions="0" time="0">
                        <shapes>
                            <shape id="1" count="1"/>
                        </shapes>
                        <result id="0"/>
                        <bitmap/>
                        <solutions>
                            <solution>
                                <assembly>0 0 0 0</assembly>
                            </solution>
                        </solutions>
                    </problem>
                </problems>
                <comment/>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {
                  "piece": 2,
                  "problem": 1,
                },
                "pieces": [
                  {
                    "bounds": "xSize:1 ySize:1 zSize:1",
                    "color": "#0000FF",
                    "id": 0,
                    "label": "Piece 1",
                    "type": "Piece",
                    "voxels": "0,0,0",
                  },
                  {
                    "bounds": "xSize:1 ySize:1 zSize:1",
                    "color": "#00FF00",
                    "id": 1,
                    "label": "Piece 2",
                    "type": "Piece",
                    "voxels": "0,0,0",
                  },
                ],
                "problems": [
                  {
                    "disassemble": false,
                    "goalPieceId": 0,
                    "id": 0,
                    "label": "Problem 1",
                    "removeNoDisassembly": true,
                    "solverId": "assembly",
                    "symmetryReduction": "rotation+mirror",
                    "type": "AssemblyProblem",
                    "usedPieceCounts": {
                      "1": 1,
                    },
                  },
                ],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Solutions",
            ],
          }
        `)
    })

    test("comment", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems/>
                <comment>foo</comment>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "description": "foo",
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {},
                "pieces": [],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
          }
        `)
    })

    test("comment popup unsupported", async () => {
        const xml = await readXmlForBurrTools(`
            <?xml version="1.0"?>
            <puzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems/>
                <comment popup="">foo</comment>
            </puzzle>
        `)
        const puzzle = await readBurrTools("puzzle.xmpuzzle", xml)
        expect(serialize(puzzle)).toMatchInlineSnapshot(`
          {
            "puzzleFile": {
              "description": "foo",
              "name": "puzzle.xmpuzzle",
              "puzzle": {
                "grid": {
                  "type": "CubicGrid",
                },
                "idCounters": {},
                "pieces": [],
                "problems": [],
                "type": "Puzzle",
              },
              "type": "PuzzleFile",
            },
            "unsupportedFeatures": [
              "Comment popup",
            ],
          }
        `)
    })
})