import {registerClass} from '~/lib/serialize.ts'
import {Voxel, Bounds} from "~/lib/Grid.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

export class SquareGrid extends CubicGrid {

    getDimensions() {
        return CubicGrid.prototype.getDimensions.call(this).slice(0, 2)
    }

    isInBounds(voxel: Voxel, bounds: Bounds): boolean {
        const {x, y} = this.voxelToCoordinate(voxel)
        return (
            x >= 0 && x < bounds[0] &&
            y >= 0 && y < bounds[1]
        )
    }

    getVoxels(bounds: Bounds) {
        const ret = []
        for(let x=0; x<bounds[0]; x++) {
            for(let y=0; y<bounds[1]; y++) {
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
        const viewpoints = CubicGrid.prototype.getViewpoints.call(this)
        return viewpoints.filter(
            viewpoint => viewpoint.id === "xy"
        )
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