import {test, expect, describe} from "vitest"

import {flatPalette, swatches} from "./colors.ts"

describe("colors", () => {
    test("swatches matches flatPalette", () => {
        const swatchesColors = new Set()
        for(const swatch of swatches) {
            for(const color of swatch) {
                swatchesColors.add(color)
            }
        }
        expect(swatchesColors).toMatchObject(new Set(flatPalette))
    })
})