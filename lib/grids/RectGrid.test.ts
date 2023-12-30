import {test, expect, describe} from "vitest"

import {RectGrid} from "./RectGrid.ts"

export const orientationTestShape = [[0, 0, 0], [1, 0, 0], [1, 1, 0]]
export const orientationTestResultingShapes = [
        // Original +X facing in +X
        orientationTestShape,
        [[0, 0, 1], [1, 0, 1], [1, 0, 0]],
        [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
        [[0, 0, 0], [1, 0, 0], [1, 0, 1]],

        // Original -X facing in +X
        [[1, 1, 0], [0, 1, 0], [0, 0, 0]],
        [[1, 0, 0], [0, 0, 0], [0, 0, 1]],
        [[1, 0, 0], [0, 0, 0], [0, 1, 0]],
        [[1, 0, 1], [0, 0, 1], [0, 0, 0]],

        // Original +Y facing in +X
        [[0, 1, 0], [0, 0, 0], [1, 0, 0]],
        [[0, 0, 0], [0, 0, 1], [1, 0, 1]],
        [[0, 0, 0], [0, 1, 0], [1, 1, 0]],
        [[0, 0, 1], [0, 0, 0], [1, 0, 0]],

        // Original -Y facing in +X
        [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
        [[1, 0, 1], [1, 0, 0], [0, 0, 0]],
        [[1, 1, 0], [1, 0, 0], [0, 0, 0]],
        [[1, 0, 0], [1, 0, 1], [0, 0, 1]],

        // Original +Z facing in +X
        [[0, 0, 1], [0, 0, 0], [0, 1, 0]],
        [[0, 1, 1], [0, 0, 1], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
        [[0, 0, 0], [0, 1, 0], [0, 1, 1]],

        // Original -Z facing in +X
        [[0, 0, 0], [0, 0, 1], [0, 1, 1]],
        [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
        [[0, 1, 1], [0, 1, 0], [0, 0, 0]],
        [[0, 1, 0], [0, 0, 0], [0, 0, 1]],
]

describe("Rectangular grid", () => {
    const grid = new RectGrid()

    test("bounds", () => {
        expect(grid.isInBounds([0, 0, 0], [0, 0, 0])).toBeFalsy()
        expect(grid.isInBounds([1, 1, 1], [0, 0, 0])).toBeTruthy()
        expect(grid.isInBounds([1, 1, 1], [0, 0, -1])).toBeFalsy()
        expect(grid.isInBounds([1, 1, 1], [0, 0, 1])).toBeFalsy()
        expect(grid.isInBounds([1, 1, 2], [0, 0, 1])).toBeTruthy()
        expect(grid.isInBounds([1, 1, 2], [0, 0, 2])).toBeFalsy()
    })

    test("getCoordinates()", () => {
        expect(
            grid.getCoordinates([2, 2, 2])
        ).toMatchObject([
            [0, 0, 0],
            [0, 0, 1],
            [0, 1, 0],
            [0, 1, 1],
            [1, 0, 0],
            [1, 0, 1],
            [1, 1, 0],
            [1, 1, 1],
        ])
        expect(
            grid.getCoordinates([1, 1, 1])
        ).toMatchObject([[0, 0, 0]])
        expect(
            grid.getCoordinates([0, 0, 0])
        ).toMatchObject([])
    })

    test("getAdjacent()", () => {
        expect(grid.getAdjacent([0, 0, 0], "+X")).toMatchObject([[1, 0, 0], "-X"])
        expect(grid.getAdjacent([0, 0, 0], "-X")).toMatchObject([[-1, 0, 0], "+X"])

        expect(grid.getAdjacent([5, 5, 5], "+X")).toMatchObject([[6, 5, 5], "-X"])
        expect(grid.getAdjacent([5, 5, 5], "-X")).toMatchObject([[4, 5, 5], "+X"])
        expect(grid.getAdjacent([5, 5, 5], "+Y")).toMatchObject([[5, 6, 5], "-Y"])
        expect(grid.getAdjacent([5, 5, 5], "-Y")).toMatchObject([[5, 4, 5], "+Y"])
        expect(grid.getAdjacent([5, 5, 5], "+Z")).toMatchObject([[5, 5, 6], "-Z"])
        expect(grid.getAdjacent([5, 5, 5], "-Z")).toMatchObject([[5, 5, 4], "+Z"])
    })

    test("orientations", () => {
        const orientations = grid.getOrientations()
        expect(orientations.length).toEqual(24)
        for(let i=0; i<24; i++) {
            expect(
                orientations[i].orientationFunc(orientationTestShape)
            ).toMatchObject(orientationTestResultingShapes[i])
        }
    })

    test("translations", () => {
        let transform = grid.getTranslation([0, 0, 0], [1, 2, 3])
        expect(transform).toMatchObject([1, 2, 3])
        expect(grid.translate([0, 0, 0], transform)).toMatchObject([1, 2, 3])
        expect(grid.translate([1, 2, 3], transform)).toMatchObject([2, 4, 6])

        transform = grid.getTranslation([3, 7, 1], [1, 2, 3])
        expect(transform).toMatchObject([-2, -5, 2])
        expect(grid.translate([0, 0, 0], transform)).toMatchObject([-2, -5, 2])
        expect(grid.translate([10, 10, 10], transform)).toMatchObject([8, 5, 12])
    })
})