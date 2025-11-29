import {test, expect, describe} from "vitest"

import {serialize, deserialize} from "~/lib/serialize.ts"
import {Shape} from "~/lib/Shape.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const grid = new CubicGrid()

describe("Shape", () => {
    test("IDs", () => {
        const shape = new Shape(0)
        expect(shape.id).toBe(0)
        expect(shape.completeId).toBe("0")

        shape.instance = 1
        expect(shape.completeId).toBe("0-1")
    })

    test("edit voxels", () => {
        const shape = new Shape(0)
        expect(shape.voxels).toEqual([])

        shape.addVoxel("0,0,0")
        expect(shape.voxels).toEqual(["0,0,0"])

        shape.addVoxel("0,0,0")
        expect(shape.voxels).toEqual(["0,0,0"])

        shape.addVoxel("1,0,0")
        expect(shape.voxels).toEqual(["0,0,0", "1,0,0"])

        shape.removeVoxel("0,0,0")
        expect(shape.voxels).toEqual(["1,0,0"])
    })

    test("adding voxel attribute to voxel that doesn't exist", () => {
        const shape = new Shape(0)
        shape.setVoxelAttribute("foo", "0,0,0", true)
        expect(shape.voxelAttributes).toEqual(undefined)
    })

    test("voxel attributes removed when voxel removed", () => {
        const shape = new Shape(0)
        shape.addVoxel("0,0,0")
        shape.addVoxel("1,0,0")
        shape.addVoxel("2,0,0")

        shape.setVoxelAttribute("foo", "0,0,0", true)
        expect(shape.voxelAttributes).toEqual({foo: {"0,0,0": true}})

        shape.setVoxelAttribute("foo", "1,0,0", true)
        expect(shape.voxelAttributes).toEqual({foo: {"0,0,0": true, "1,0,0": true}})

        shape.setVoxelAttribute("bar", "2,0,0", true)
        expect(shape.voxelAttributes).toEqual({foo: {"0,0,0": true, "1,0,0": true}, bar: {"2,0,0": true}})

        shape.removeVoxel("0,0,0")
        expect(shape.voxelAttributes).toEqual({foo: {"1,0,0": true}, bar: {"2,0,0": true}})

        shape.removeVoxel("1,0,0")
        expect(shape.voxelAttributes).toEqual({bar: {"2,0,0": true}})

        shape.removeVoxel("2,0,0")
        expect(shape.voxelAttributes).toEqual(undefined)
    })

    test("unset voxel attribute", () => {
        const shape = new Shape(0)
        shape.addVoxel("0,0,0")
        shape.setVoxelAttribute("foo", "0,0,0", true)
        shape.setVoxelAttribute("bar", "0,0,0", false)
        expect(shape.voxelAttributes).toEqual({
            foo: {"0,0,0": true},
            bar: {"0,0,0": false},
        })

        shape.unsetVoxelAttribute("foo", "0,0,0")
        expect(shape.voxelAttributes).toEqual({
            bar: {"0,0,0": false},
        })

        shape.unsetVoxelAttribute("bar", "0,0,0")
        expect(shape.voxelAttributes).toEqual(undefined)
    })

    test("copy", () => {
        const shape0 = new Shape(0)
        const copy0 = shape0.copy()
        expect(copy0).not.toBe(shape0)
        expect(copy0).toEqual(shape0)

        const shape1 = new Shape(1)
        const copy1 = shape1.copy()
        expect(copy1).not.toBe(shape1)
        expect(copy1).toEqual(shape1)
    })

    test("equality", () => {
        const shape1 = new Shape(1)
        const shape2 = new Shape(2)

        shape1.voxels = ["0,0,0", "1,1,1"]
        shape2.voxels = ["1,1,1", "0,0,0"]
        expect(shape1.equals(shape2)).toBeTruthy()

        shape1.voxels.push("0,0,0")
        expect(shape1.equals(shape2)).toBeTruthy()

        shape1.voxels.push("0,1,0")
        expect(shape1.equals(shape2)).toBeFalsy()
    })

    test("equality with voxelAttribute", () => {
        const shape1 = new Shape(1)
        const shape2 = new Shape(2)

        shape1.voxels = ["0,0,0", "1,1,1"]
        shape2.voxels = ["0,0,0", "1,1,1"]
        expect(shape1.equals(shape2)).toBeTruthy()

        shape1.setVoxelAttribute("foo", "0,0,0", true)
        expect(shape1.equals(shape2)).toBeFalsy()

        shape2.setVoxelAttribute("foo", "0,0,0", false)
        expect(shape1.equals(shape2)).toBeFalsy()

        shape2.setVoxelAttribute("foo", "0,0,0", true)
        expect(shape1.equals(shape2)).toBeTruthy()

        shape1.setVoxelAttribute("bar", "0,0,0", true)
        expect(shape1.equals(shape2)).toBeFalsy()

        shape2.setVoxelAttribute("bar", "0,0,0", true)
        expect(shape1.equals(shape2)).toBeTruthy()

        // Attribute on non-existant voxel doesn't affect equality
        shape2.setVoxelAttribute("baz", "8,8,8", true)
        expect(shape1.equals(shape2)).toBeTruthy()
    })

    test("transform", () => {
        const shape = new Shape(0)
        shape.voxels = ["0,0,0", "1,1,1"]

        const translate = grid.getTranslation("0,0,0", "1,0,0")
        shape.doTransform(grid, translate)
        expect(shape.voxels).toEqual(["1,0,0", "2,1,1"])
        expect(shape.voxelAttributes).toEqual(undefined)
    })

    test("transform with voxelAttributes", () => {
        const shape = new Shape(0, ["0,0,0", "1,1,1"])
        shape.setVoxelAttribute("foo", "0,0,0", true)

        const translate = grid.getTranslation("0,0,0", "1,0,0")
        shape.doTransform(grid, translate)
        expect(shape.voxels).toEqual(["1,0,0", "2,1,1"])
        expect(shape.voxelAttributes).toEqual({
            "foo": {
                "1,0,0": true
            }
        })

        // Transform when voxel attribute on a voxel that's not a part of this
        // shape
        shape.setVoxelAttribute("foo", "9,9,9", true)
        shape.doTransform(grid, translate)
        expect(shape.voxels).toEqual(["2,0,0", "3,1,1"])
        expect(shape.voxelAttributes).toEqual({
            "foo": {
                "2,0,0": true
            }
        })
    })

    test("transform multiple (translation)", () => {
        const shape0 = new Shape(0, ["0,0,0", "1,0,0"])
        const shape1 = new Shape(1, ["2,0,0", "3,0,0"])

        const translate = grid.getTranslation("0,0,0", "0,1,0")
        Shape.transformAssembly(grid, [shape0, shape1], translate)

        expect(shape0.voxels).toEqual(["0,1,0", "1,1,0"])
        expect(shape1.voxels).toEqual(["2,1,0", "3,1,0"])
    })

    test("transform multiple (rotation)", () => {
        const shape0 = new Shape(0, ["0,0,0", "1,0,0"])
        const shape1 = new Shape(1, ["2,0,0", "3,0,0"])

        Shape.transformAssembly(grid, [shape0, shape1], "r:-Y,0")
        expect(shape0.voxels).toEqual(["0,0,0", "0,1,0"])
        expect(shape1.voxels).toEqual(["0,2,0", "0,3,0"])
    })

    test("serialization", () => {
        const shape = new Shape(0, ["0,0,0", "1,1,1"])
        shape.bounds = {a: 1, b: 2, c: 3}

        const serialized = serialize(shape)
        expect(serialized).toEqual({
            "type": "Shape",
            "id": 0,
            "bounds": "a:1 b:2 c:3",
            "voxels": "0,0,0; 1,1,1",
        })

        const deserialized = deserialize(serialized)
        expect(deserialized).toEqual(shape)
    })
})