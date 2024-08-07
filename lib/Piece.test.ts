import {test, expect, describe} from "vitest"

import {serialize, deserialize} from "~/lib/serialize.ts"
import {Piece} from "~/lib/Piece.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const grid = new CubicGrid()

describe("Piece", () => {
    test("IDs", () => {
        const piece = new Piece(0)
        expect(piece.id).toBe(0)
        expect(piece.completeId).toBe("0")

        piece.instance = 1
        expect(piece.completeId).toBe("0-1")
    })

    test("edit voxels", () => {
        const piece = new Piece(0)
        expect(piece.voxels).toEqual([])

        piece.addVoxel("0,0,0")
        expect(piece.voxels).toEqual(["0,0,0"])

        piece.addVoxel("0,0,0")
        expect(piece.voxels).toEqual(["0,0,0"])

        piece.addVoxel("1,0,0")
        expect(piece.voxels).toEqual(["0,0,0", "1,0,0"])

        piece.removeVoxel("0,0,0")
        expect(piece.voxels).toEqual(["1,0,0"])
    })

    test("adding voxel attribute to voxel that doesn't exist", () => {
        const piece = new Piece(0)
        piece.setVoxelAttribute("foo", "0,0,0", true)
        expect(piece.voxelAttributes).toEqual(undefined)
    })

    test("voxel attributes removed when voxel removed", () => {
        const piece = new Piece(0)
        piece.addVoxel("0,0,0")
        piece.addVoxel("1,0,0")
        piece.addVoxel("2,0,0")

        piece.setVoxelAttribute("foo", "0,0,0", true)
        expect(piece.voxelAttributes).toEqual({foo: {"0,0,0": true}})

        piece.setVoxelAttribute("foo", "1,0,0", true)
        expect(piece.voxelAttributes).toEqual({foo: {"0,0,0": true, "1,0,0": true}})

        piece.setVoxelAttribute("bar", "2,0,0", true)
        expect(piece.voxelAttributes).toEqual({foo: {"0,0,0": true, "1,0,0": true}, bar: {"2,0,0": true}})

        piece.removeVoxel("0,0,0")
        expect(piece.voxelAttributes).toEqual({foo: {"1,0,0": true}, bar: {"2,0,0": true}})

        piece.removeVoxel("1,0,0")
        expect(piece.voxelAttributes).toEqual({bar: {"2,0,0": true}})

        piece.removeVoxel("2,0,0")
        expect(piece.voxelAttributes).toEqual(undefined)
    })

    test("unset voxel attribute", () => {
        const piece = new Piece(0)
        piece.addVoxel("0,0,0")
        piece.setVoxelAttribute("foo", "0,0,0", true)
        piece.setVoxelAttribute("bar", "0,0,0", false)
        expect(piece.voxelAttributes).toEqual({
            foo: {"0,0,0": true},
            bar: {"0,0,0": false},
        })

        piece.unsetVoxelAttribute("foo", "0,0,0")
        expect(piece.voxelAttributes).toEqual({
            bar: {"0,0,0": false},
        })

        piece.unsetVoxelAttribute("bar", "0,0,0")
        expect(piece.voxelAttributes).toEqual(undefined)
    })

    test("copy", () => {
        const piece0 = new Piece(0)
        const copy0 = piece0.copy()
        expect(copy0).not.toBe(piece0)
        expect(copy0).toEqual(piece0)

        const piece1 = new Piece(1)
        const copy1 = piece1.copy()
        expect(copy1).not.toBe(piece1)
        expect(copy1).toEqual(piece1)
    })

    test("equality", () => {
        const piece1 = new Piece(1)
        const piece2 = new Piece(2)

        piece1.voxels = ["0,0,0", "1,1,1"]
        piece2.voxels = ["1,1,1", "0,0,0"]
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.voxels.push("0,0,0")
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.voxels.push("0,1,0")
        expect(piece1.equals(piece2)).toBeFalsy()
    })

    test("equality with voxelAttribute", () => {
        const piece1 = new Piece(1)
        const piece2 = new Piece(2)

        piece1.voxels = ["0,0,0", "1,1,1"]
        piece2.voxels = ["0,0,0", "1,1,1"]
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.setVoxelAttribute("foo", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeFalsy()

        piece2.setVoxelAttribute("foo", "0,0,0", false)
        expect(piece1.equals(piece2)).toBeFalsy()

        piece2.setVoxelAttribute("foo", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.setVoxelAttribute("bar", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeFalsy()

        piece2.setVoxelAttribute("bar", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeTruthy()

        // Attribute on non-existant voxel doesn't affect equality
        piece2.setVoxelAttribute("baz", "8,8,8", true)
        expect(piece1.equals(piece2)).toBeTruthy()
    })

    test("transform", () => {
        const piece = new Piece(0)
        piece.voxels = ["0,0,0", "1,1,1"]

        const translate = grid.getTranslation("0,0,0", "1,0,0")
        piece.doTransform(grid, translate)
        expect(piece.voxels).toEqual(["1,0,0", "2,1,1"])
        expect(piece.voxelAttributes).toEqual(undefined)
    })

    test("transform with voxelAttributes", () => {
        const piece = new Piece(0, ["0,0,0", "1,1,1"])
        piece.setVoxelAttribute("foo", "0,0,0", true)

        const translate = grid.getTranslation("0,0,0", "1,0,0")
        piece.doTransform(grid, translate)
        expect(piece.voxels).toEqual(["1,0,0", "2,1,1"])
        expect(piece.voxelAttributes).toEqual({
            "foo": {
                "1,0,0": true
            }
        })

        // Transform when voxel attribute on a voxel that's not a part of this
        // piece
        piece.setVoxelAttribute("foo", "9,9,9", true)
        piece.doTransform(grid, translate)
        expect(piece.voxels).toEqual(["2,0,0", "3,1,1"])
        expect(piece.voxelAttributes).toEqual({
            "foo": {
                "2,0,0": true
            }
        })
    })

    test("transform multiple (translation)", () => {
        const piece0 = new Piece(0, ["0,0,0", "1,0,0"])
        const piece1 = new Piece(1, ["2,0,0", "3,0,0"])

        const translate = grid.getTranslation("0,0,0", "0,1,0")
        Piece.transformAssembly(grid, [piece0, piece1], translate)

        expect(piece0.voxels).toEqual(["0,1,0", "1,1,0"])
        expect(piece1.voxels).toEqual(["2,1,0", "3,1,0"])
    })

    test("transform multiple (rotation)", () => {
        const piece0 = new Piece(0, ["0,0,0", "1,0,0"])
        const piece1 = new Piece(1, ["2,0,0", "3,0,0"])

        Piece.transformAssembly(grid, [piece0, piece1], "r:-Y,0")
        expect(piece0.voxels).toEqual(["0,0,0", "0,1,0"])
        expect(piece1.voxels).toEqual(["0,2,0", "0,3,0"])
    })

    test("serialization", () => {
        const piece = new Piece(0, ["0,0,0", "1,1,1"])
        piece.bounds = {a: 1, b: 2, c: 3}

        const serialized = serialize(piece)
        expect(serialized).toEqual({
            "type": "Piece",
            "id": 0,
            "bounds": "a:1 b:2 c:3",
            "voxels": "0,0,0; 1,1,1",
        })

        const deserialized = deserialize(serialized)
        expect(deserialized).toEqual(piece)
    })
})