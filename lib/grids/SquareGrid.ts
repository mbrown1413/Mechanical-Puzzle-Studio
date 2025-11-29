import {registerClass} from "~/lib/serialize.ts"
import {Voxel} from "~/lib/Grid.ts"
import {Shape} from "~/lib/Shape.ts"
import {CubicBounds, CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {Form} from "~/lib/forms.ts"

export class SquareGrid extends CubicGrid {
    static gridTypeName = "Square"
    static gridTypeDescription = "Regularly tiled squares in two dimensions"

    flippable: boolean

    constructor() {
        super()
        this.flippable = true
    }

    getForm(): Form {
        return {
            fields: [
                {
                    type: "checkbox",
                    property: "flippable",
                    label: "Flippable",
                    description: 'Whether shapes are "two-sided" and may be flipped in solutions',
                },
            ]
        }
    }

    get boundsEditInfo() {
        return {
            dimensions: [
                {name: "X", boundsProperty: "xSize"},
                {name: "Y", boundsProperty: "ySize"},
            ]
        }
    }

    getVoxels(bounds: CubicBounds) {
        const ret = []
        const xMin = bounds.x || 0
        const yMin = bounds.y || 0
        const xMax = xMin + bounds.xSize
        const yMax = yMin + bounds.ySize
        for(let x=xMin; x < xMax; x++) {
            for(let y=yMin; y < yMax; y++) {
                ret.push(this.coordinateToVoxel({x, y, z: 0}))
            }
        }
        return ret
    }

    validateVoxel(voxel: Voxel) {
        let coordinate
        try {
            coordinate = this.voxelToCoordinate(voxel)
        } catch {
            return false
        }
        return coordinate.z === 0
    }

    getRotations(includeMirrors: boolean) {
        const rotations = [
            "r:+X,0",
            "r:-X,0",
            "r:+Y,0",
            "r:-Y,0",
        ]
        // Flipping is the same as mirroring when we restrict ourselves to two
        // dimensions, so we don't need to include mirrors in addition to flips.
        if(this.flippable || includeMirrors) {
            rotations.push(...[
                "r:+X,2",
                "r:-X,2",
                "r:+Y,2",
                "r:-Y,2",
            ])
        }
        return rotations
    }

    getDisassemblyTransforms() {
        return [
            this.getTranslation("0,0,0", "1,0,0"),
            this.getTranslation("0,0,0", "-1,0,0"),
            this.getTranslation("0,0,0", "0,1,0"),
            this.getTranslation("0,0,0", "0,-1,0"),
        ]
    }

    getViewpoints() {
        let viewpoints = CubicGrid.prototype.getViewpoints.call(this)
        viewpoints = viewpoints.filter(
            viewpoint => viewpoint.id === "xy"
        )
        for(const viewpoint of viewpoints) {
            viewpoint.getNLayers = () => 1
        }
        return viewpoints
    }

    /**
     * Produce a set of shapes from a string representation.
     * 
     * Each character represents a voxel. A number 0-9 is an ID of the shape in
     * that voxel. The following characters represent a voxel without a shape:
     * ".", "-", " "
     *
     * For example:
     *
     *     grid.shapesFromString(`
     *         000
     *         1.0
     *         111
     *     `)
     */
    shapesFromString(layoutString: string): Shape[] {
        const shapes: {[id: number]: Shape} = {}
        for(const [y, line] of layoutString.split("\n").entries()) {
            for(let x=0; x<line.length; x++) {
                const char = line[x]
                if(char === " " || char === "." || char === "-") {
                    continue
                }

                const id = Number(line[x])
                if(isNaN(id)) {
                    throw new Error(`Unexpected non-number ID: ${line[x]}`)
                }

                const shape = shapes[id] || new Shape(id)
                shapes[id] = shape
                shape.addVoxel(`${x},-${y},0`)
            }
        }

        // Translate all shapes so the bounds is 0,0
        const bounds = this.getBoundsMax(
            ...Object.values(shapes).map(
                p => this.getVoxelBounds(p.voxels)
            )
        )
        const translation = this.getTranslation(
            this.coordinateToVoxel(
                {x: bounds.x || 0, y: bounds.y || 0, z: bounds.z || 0}
            ), 
            "0,0,0"
        )
        for(const shape of Object.values(shapes)) {
            shape.doTransform(this, translation)
        }

        return Object.values(shapes)
    }
}

registerClass(SquareGrid)