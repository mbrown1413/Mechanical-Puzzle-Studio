import {test, expect, describe} from "vitest"

import {filterSymmetricalAssemblies} from "./symmetry"
import {Shape} from "~/lib/Shape.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

describe("filterSymmetricalAssemblies()", () => {
    const grid = new CubicGrid()

    test("identical assemblies", () => {
        const assemblies = [
            [new Shape(0, ["0,0,0", "1,1,0"])],
            [new Shape(1, ["0,0,0", "1,1,0"])],
        ]
        const filtered = filterSymmetricalAssemblies(grid, assemblies)
        expect(filtered).toEqual([assemblies[0]])
    })

    test("shifted assemblies", () => {
        const assemblies = [
            [new Shape(0, ["0,0,0", "1,1,0"])],
            [new Shape(1, ["5,3,0", "6,4,0"])],
        ]
        const filtered = filterSymmetricalAssemblies(grid, assemblies)
        expect(filtered).toEqual([assemblies[0]])
    })

    test("rotated assemblies", () => {
        const assemblies = [
            [new Shape(0, ["0,0,0", "1,1,0"])],
            [new Shape(1, ["0,0,0", "1,-1,0"])],
            [new Shape(2, ["0,0,0", "-1,-1,0"])],
            [new Shape(3, ["0,0,0", "-1,1,0"])],
        ]
        const filtered = filterSymmetricalAssemblies(grid, assemblies)
        expect(filtered).toEqual([assemblies[0]])
    })

    test("mirrored assemblies", () => {
        const assemblies = [
            [new Shape(0, ["0,0,0", "1,0,0", "1,1,0", "1,1,1"])],
            [new Shape(1, ["0,0,0", "1,0,0", "1,1,0", "1,1,-1"])],
        ]
        const filtered = filterSymmetricalAssemblies(grid, assemblies)
        expect(filtered).toEqual([assemblies[0]])
    })

    test("don't mirrored assemblies if mirrorSymmetry=false", () => {
        const assemblies = [
            [new Shape(0, ["0,0,0", "1,0,0", "1,1,0", "1,1,1"])],
            [new Shape(1, ["0,0,0", "1,0,0", "1,1,0", "1,1,-1"])],
        ]
        const filtered = filterSymmetricalAssemblies(grid, assemblies, false)
        expect(filtered).toEqual(assemblies)
    })
})