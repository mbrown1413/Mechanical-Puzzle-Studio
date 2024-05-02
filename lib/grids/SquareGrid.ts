import {registerClass} from '~/lib/serialize.ts'
import {CubicBounds, CubicGrid} from "~/lib/grids/CubicGrid.ts"

export class SquareGrid extends CubicGrid {

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

    getRotations() {
        return [
            "r:+X,0", "r:+X,2",
            "r:-X,0", "r:-X,2",
            "r:+Y,0", "r:+Y,2",
            "r:-Y,0", "r:-Y,2",
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

    getDisassemblyTransforms() {
        return [
            this.getTranslation("0,0,0", "1,0,0"),
            this.getTranslation("0,0,0", "-1,0,0"),
            this.getTranslation("0,0,0", "0,1,0"),
            this.getTranslation("0,0,0", "0,-1,0"),
        ]
    }
}

registerClass(SquareGrid)