import Color from "colorjs.io"

function isSimilar(color1: string, color2: string): boolean {
    const c1 = new Color(color1)
    const c2 = new Color(color2)
    const dist = Color.deltaE(c1, c2, "ITP")
    return dist < 40
}

/**
 * Return a color as distinct as possible from the given colors.
 */
export function getNextColor(existingColors: string[]): string {
    // For now, we only select from a predefined palette. We choose the first
    // one that has the least number of close colors already existing.

    // Map color in palette to number of matches in existingColors
    const similarCount: Map<string, number> = new Map()
    for(const paletteColor of palette) {
        for(const existingColor of existingColors) {
            if(isSimilar(existingColor, paletteColor)) {
                similarCount.set(
                    paletteColor,
                    (similarCount.get(paletteColor) || 0) + 1
                )
            }
        }
    }
    
    let minNumSimilar
    if(similarCount.size < palette.length) {
        minNumSimilar = 0
    } else {
        minNumSimilar = Math.min(...similarCount.values())
    }

    for(const color of palette) {
        const count = similarCount.get(color) || 0
        if(count <= minNumSimilar) {
            return color
        }
    }

    return palette[0]  // Should never happen
}

/**
 * List of predefined colors that are all perceivably different.
 * 
 * This list was made by taking multiple seaborn palettes and eliminating colors
 * which are too similar to previous ones. Color similarity was calculated using
 * deltaE ITP and removed if less than 40.
 * 
 * See:
 *   https://seaborn.pydata.org/generated/seaborn.color_palette.html
 *   https://seaborn.pydata.org/tutorial/color_palettes.html
 *   https://colorjs.io/docs/color-difference
 *   
 * This produces much more distinct colors than going through the RGB
 * colorspace systematically (#ff0000, #00ff00, etc.). I'm sure there could be
 * many more improvements to this, but this will do for now.
 */
const palette = [
    // Seaborn "bright"
    "#023eff",
    "#ff7c00",
    "#1ac938",
    "#e8000b",
    "#8b2be2",
    "#9f4800",
    "#f14cc1",
    //"#a3a3a3",  // Gray, close to background
    "#ffc400",
    "#00d7ff",

    // Seaborn "pastel"
    //"#a1c9f4",  // Too close to #00d7ff
    //"#ffb482",  // Too colse to #ffc400
    "#8de5a1",
    //"#ff9f9b",  // Too close to #ffbf82
    "#d0bbff",
    //"#debb9b",  // Too close to #ffb482
    //"#fab0e4",  // Too close to #dobbff
    //"#cfcfcf",  // Gray, close to background
    "#fffea3",
    //"#b9f2f0",  // Too close to #d8e5a1
    
    // Seaborn "dark"
    "#001c7f",
    //"#b1400d",  // Too close to #9f4800
    "#12711c",
    "#8c0800",
    "#591e71",
    "#592f0d",
    "#a23582",
    "#3c3c3c",
    "#b8850a",
    "#006374",
]