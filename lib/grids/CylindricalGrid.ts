import {BufferGeometry, Vector3, Shape, ShapeGeometry, Matrix4} from "three"

import {registerClass} from "~/lib/serialize.ts"
import {Grid, Voxel, Viewpoint, Transform, VoxelInfo} from "~/lib/Grid.ts"
import {Form} from "~/lib/forms.ts"

import {makeRectGeometry} from "~/ui/utils/threejs-objects.ts"

/**
 * Typical cylindrical coordinates as definied here:
 * https://en.wikipedia.org/wiki/Cylindrical_coordinate_system
 * 
 * rho (ρ) - Number of "shells" from the center.
 * phi (φ) - Which "pie wedge" in the cylinder.
 * zed (z) - The height, choosing from stacked cylinders.
 */
type CylindricalCoord = {
    rho: number
    phi: number
    zed: number
}

type CylindricalBounds = {
    rho?: number, rhoSize: number,
    phi?: number, phiSize?: number,  // Default to whole pie
    zed?: number, zedSize: number,
}

type CylindricalDirection = "+rho" | "-rho" | "+phi" | "-phi" | "+zed" | "-zed"

/**
 * Shells of cylinders stacked and divided into pie wedges.
 */
export class CylindricalGrid extends Grid {
    static gridTypeName = "Cylindrical"
    static gridTypeDescription = ""

    nDivisions: number

    constructor() {
        super()
        this.nDivisions = 4
    }

    getForm(): Form {
        return {
            fields: [
                {
                    type: "integer",
                    property: "nDivisions",
                    label: "Wedges",
                    description: "The number of radial slices of the cylinder",
                    min: 1,
                },
            ]
        }
    }

    protected voxelToCoordinate(voxel: Voxel): CylindricalCoord {
        const coord = voxel.split(",", 3)
        if(coord.length !== 3) {
            throw new Error(`Invalid cubic coordinate: ${voxel}`)
        }
        return {
            rho: Number(coord[0]),
            phi: Number(coord[1]),
            zed: Number(coord[2])
        }
    }

    protected coordinateToVoxel(coordinate: CylindricalCoord): Voxel {
        return `${coordinate.rho},${coordinate.phi},${coordinate.zed}`
    }

    protected getLayerBottomZ(zed: number) {
        return zed
    }

    protected getLayerTopZ(zed: number) {
        return zed + 1
    }

    getDefaultPieceBounds(): CylindricalBounds {
        return {
            rhoSize: 3,
            zedSize: 3,
        }
    }

    get boundsEditInfo() {
        return {
            dimensions: [
                {name: "Shells", boundsProperty: "rhoSize"},
                {name: "Height", boundsProperty: "zedSize"},
            ]
        }
    }

    isInBounds(voxel: Voxel, bounds: CylindricalBounds): boolean {
        const {rho, phi, zed} = this.voxelToCoordinate(voxel)
        const rhoMin = (bounds.rho || 0)
        const phiMin = (bounds.phi || 0)
        const zedMin = (bounds.zed || 0)
        const rhoMax = rhoMin + bounds.rhoSize - 1
        const phiMax = phiMin + (bounds.phiSize || this.nDivisions) - 1
        const zedMax = zedMin + bounds.zedSize - 1
        if(
            rho < rhoMin || rho > rhoMax ||
            zed < zedMin || zed > zedMax
        ) {
            return false
        }
        if(phi < phiMin || phi > phiMax) {
            // Only phi didn't pass the check, so check if phiSize wraps around
            // and our given phi fits within it.
            return (
                phiMax >= this.nDivisions &&
                phi <= phiMax - this.nDivisions
            )
        }
        return true
    }

    validateBounds(bounds: CylindricalBounds) {
        const keys = Object.keys(bounds)
        return ["rhoSize", "zedSize"].every(
            expectedKey => keys.includes(expectedKey)
        )
    }

    getVoxelBounds(voxels: Voxel[]): CylindricalBounds {
        if(voxels.length === 0) {
            return this.getDefaultPieceBounds()
        }
        const min = this.voxelToCoordinate(voxels[0])
        const max = this.voxelToCoordinate(voxels[0])
        const allPhi: Set<number> = new Set()
        for(const voxel of voxels) {
            const {rho, phi, zed} = this.voxelToCoordinate(voxel)
            allPhi.add(phi)
            min.rho = Math.min(min.rho, rho)
            min.zed = Math.min(min.zed, zed)
            max.rho = Math.max(max.rho, rho)
            max.zed = Math.max(max.zed, zed)
        }

        const {phiStart, phiSize} = getPhiRange(allPhi, this.nDivisions)

        return {
            rho: min.rho,
            phi: phiStart,
            zed: min.zed,
            rhoSize: max.rho - min.rho + 1,
            phiSize: phiSize,
            zedSize: max.zed - min.zed + 1,
        }
    }

    validateVoxel(voxel: Voxel): boolean {
        let coordinate
        try {
            coordinate = this.voxelToCoordinate(voxel)
        } catch {
            return false
        }
        return coordinate.phi >= 0 && coordinate.phi < this.nDivisions
    }

    getBoundsMax(...bounds: CylindricalBounds[]): CylindricalBounds {
        if(bounds.length === 0) {
            return this.getDefaultPieceBounds()
        }

        let rhoMin = bounds[0].rho || 0
        let zedMin = bounds[0].zed || 0
        let rhoMax = rhoMin
        let zedMax = zedMin

        const allPhi: Set<number> = new Set()
        for(const bound of bounds) {
            rhoMin = Math.min(rhoMin, bound.rho || 0)
            zedMin = Math.min(zedMin, bound.zed || 0)
            rhoMax = Math.max(rhoMax, (bound.rho || 0) + bound.rhoSize - 1)
            zedMax = Math.max(zedMax, (bound.zed || 0) + bound.zedSize - 1)

            for(let i=0; i<(bound.phiSize || this.nDivisions); i++) {
                allPhi.add(((bound.phi || 0) + i) % this.nDivisions)
            }
        }

        const {phiStart, phiSize} = getPhiRange(allPhi, this.nDivisions)

        return {
            rho: rhoMin,
            phi: phiStart,
            zed: zedMin,
            rhoSize: rhoMax - rhoMin + 1,
            phiSize: phiSize,
            zedSize: zedMax - zedMin + 1,
        }
    }

    getVoxelInfo(voxel: Voxel): VoxelInfo {
        const sides = [
            "+rho", "+phi", "-phi", "+zed", "-zed"
        ]

        if(this.voxelToCoordinate(voxel).rho !== 0) {
            sides.push("-rho")
        }
        return {voxel, sides}
    }

    getVoxels(bounds: CylindricalBounds): Voxel[] {
        const ret = []
        const phiSize = (bounds.phiSize || this.nDivisions)
        for(let i=0; i<bounds.rhoSize; i++) {
            for(let j=0; j<phiSize; j++) {
                for(let k=0; k<bounds.zedSize; k++) {
                    ret.push(this.coordinateToVoxel({
                        rho: (bounds.rho || 0) + i,
                        phi: ((bounds.phi || 0) + j) % this.nDivisions,
                        zed: (bounds.zed || 0) + k,
                    }))
                }
            }
        }
        return ret
    }

    getSideInfo(voxel: Voxel, direction: CylindricalDirection) {
        const {rho, phi, zed} = this.voxelToCoordinate(voxel)
        const coord = direction.slice(1, 4)
        const polarity = direction[0]

        const shellDivisions = this.nDivisions
        const innerRadius = rho
        const outerRadius = rho + 1
        const thetaStart = 2*Math.PI * phi / shellDivisions
        const thetaEnd = 2*Math.PI * (phi + 1) / shellDivisions

        // The +zed cylindrical direction points in the world's +y direction.
        // This is done because the camera rotates about the +y axis.
        const innerStartX = Math.cos(thetaStart) * innerRadius
        const innerStartZ = Math.sin(thetaStart) * innerRadius
        const innerEndX = Math.cos(thetaEnd) * innerRadius
        const innerEndZ = Math.sin(thetaEnd) * innerRadius
        const outerStartX = Math.cos(thetaStart) * outerRadius
        const outerStartZ = Math.sin(thetaStart) * outerRadius
        const outerEndX = Math.cos(thetaEnd) * outerRadius
        const outerEndZ = Math.sin(thetaEnd) * outerRadius
        const bottomY = this.getLayerBottomZ(zed)
        const topY = this.getLayerTopZ(zed)

        let wireframe: Vector3[]
        let solid: BufferGeometry

        if(coord === "rho") {
            const startX = polarity === "-" ? innerStartX : outerStartX
            const startZ = polarity === "-" ? innerStartZ : outerStartZ
            const endX = polarity === "-" ? innerEndX : outerEndX
            const endZ = polarity === "-" ? innerEndZ : outerEndZ

            const points: [Vector3, Vector3, Vector3, Vector3] = [
                new Vector3(startX, bottomY, startZ),
                new Vector3(startX, topY, startZ),
                new Vector3(endX, topY, endZ),
                new Vector3(endX, bottomY, endZ),
            ]
            wireframe = points
            solid = makeRectGeometry(...points)

        } else if(coord === "phi") {
            const innerX = polarity === "-" ? innerStartX : innerEndX
            const innerZ = polarity === "-" ? innerStartZ : innerEndZ
            const outerX = polarity === "-" ? outerStartX : outerEndX
            const outerZ = polarity === "-" ? outerStartZ : outerEndZ

            const points: [Vector3, Vector3, Vector3, Vector3] = [
                new Vector3(innerX, bottomY, innerZ),
                new Vector3(innerX, topY, innerZ),
                new Vector3(outerX, topY, outerZ),
                new Vector3(outerX, bottomY, outerZ),
            ]
            wireframe = points
            solid = makeRectGeometry(...points)

        } else if(coord === "zed") {
            const y = polarity === "-" ? bottomY : topY

            const innerStart = new Vector3(innerStartX, y, innerStartZ)
            const innerEnd = new Vector3(innerEndX, y, innerEndZ)
            const outerStart = new Vector3(outerEndX, y, outerEndZ)
            const outerEnd = new Vector3(outerStartX, y, outerStartZ)
            wireframe = [innerStart, innerEnd, outerStart, outerEnd]

            // Shapes are drawn on the X-Y plane in threejs, but we we want it
            // on the X-Z plane. We draw the shape, then do a matrix
            // multiplication to switch the Y and Z coordinates.
            const shape = new Shape()
            shape.moveTo(innerStartX, innerStartZ)
            shape.lineTo(innerEndX, innerEndZ)
            shape.lineTo(outerEndX, outerEndZ)
            shape.lineTo(outerStartX, outerStartZ)
            solid = new ShapeGeometry(shape)
            solid.applyMatrix4(new Matrix4(
                1, 0, 0, 0,
                0, 0, 1, 0,
                0, 1, 0, 0,
                0, 0, 0, 1,
            ))
            solid.translate(0, y, 0)

        } else {
            throw new Error(`Unrecognized direction "${direction}"`)
        }
        return {solid, wireframe}
    }

    doTransform(transform: Transform, voxels: Voxel[]): Voxel[] {

        // Translate around the cylindar (phi) and up and down (zed)
        if(/^t:(-?\d+,?){2}$/.test(transform)) {
            const offsets = transform.slice(2).split(",").map(Number)
            return voxels.map((voxel: Voxel) => {
                const coordinate = this.voxelToCoordinate(voxel)
                return this.coordinateToVoxel({
                    rho: coordinate.rho,
                    phi: positiveMod(coordinate.phi + offsets[0], this.nDivisions),
                    zed: coordinate.zed + offsets[1],
                })
            })
        }

        // Flip about the zed=0 plane along the phi=0 line
        if(transform === "flip") {
            return voxels.map((voxel) => {
                const coordinate = this.voxelToCoordinate(voxel)
                return this.coordinateToVoxel({
                    rho: coordinate.rho,
                    phi: positiveMod(this.nDivisions - coordinate.phi, this.nDivisions),
                    zed: coordinate.zed * -1,
                })
            })
        }

        throw new Error(`Transform in unknown format: ${transform}`)
    }

    scaleTransform(transform: Transform, amount: number): Transform {
        if(/^t:(-?\d+,?){2}$/.test(transform)) {
            const offsets = transform.slice(2).split(",").map(Number)
            offsets[0] *= amount
            offsets[1] *= amount
            return `t:${offsets[0]},${offsets[1]}`
        }

        throw new Error(`Scaling not supported on transform: ${transform}`)
    }

    getRotations(_includeMirrors: boolean): Transform[] {
        // Note: We don't yet have a transform for mirroring. We could also in
        // the future add a flag "flippable" so pieces have an orientation and
        // can't be turned upside down.
        return ["t:0,0", "flip"]
    }

    getTranslation(from: Voxel, to: Voxel) {
        const fromCoordinate = this.voxelToCoordinate(from)
        const toCoordinate = this.voxelToCoordinate(to)
        if(fromCoordinate.rho !== toCoordinate.rho) { return null }
        const deltaPhi = toCoordinate.phi - fromCoordinate.phi
        const deltaZed = toCoordinate.zed - fromCoordinate.zed
        return `t:${deltaPhi},${deltaZed}`
    }

    getOriginTranslation(voxels: Voxel[]): Transform {
        const bounds = this.getVoxelBounds(voxels)
        return `t:${-(bounds.phi || 0)},${-(bounds.zed || 0)}`
    }

    getDisassemblyTransforms(): Transform[] {
        throw new Error("Cylindrical grid does not support disassembly")
    }

    isSeparate(_group1: Voxel[], _group2: Voxel[]): boolean {
        throw new Error("Cylindrical grid does not support disassembly")
    }

    getViewpoints(): Viewpoint[] {
        return [
            {
                id: "+zed",
                name: "Above",
                forwardVector: new Vector3(0, -1, 0),
                xVector: new Vector3(1, 0, 0),
                getNLayers(bounds: CylindricalBounds) { return bounds.zedSize },
                isInLayer: (voxel, layerIndex) => this.voxelToCoordinate(voxel).zed == layerIndex,
            }
        ]
    }
}

registerClass(CylindricalGrid)


/**
 * Get the smallest range which covers all the phi values.
 */
function getPhiRange(allPhi: Set<number>, nDivisions: number) {
    const sortedPhi = [...new Set(allPhi)].toSorted((a, b) => a - b)

    // Find the largest gap between sorted phi values. The inverse of this gap
    // is our smallest range covering all values.
    let largestGapSize: number = 1
    let largestGapEnd: number | null = null
    for(let i=0; i<sortedPhi.length; i++) {
        const phi1 = sortedPhi[i]
        const phi2 = sortedPhi[(i+1)% sortedPhi.length]
        let gap = phi2 - phi1
        if(gap < 0) {
            gap += nDivisions
        }
        if(largestGapEnd === null || gap > largestGapSize) {
            largestGapSize = gap
            largestGapEnd = phi2
        }
    }
    if(largestGapEnd === null) {
        largestGapEnd = 0
    }

    // If we've gone full circle, might as well start at 0
    if(largestGapSize === 1) {
        largestGapEnd = 0
    }

    return {
        phiStart: largestGapEnd,
        phiSize: largestGapSize === 0 ? 1 : nDivisions - largestGapSize + 1
    }
}

function positiveMod(x: number, divisor: number) {
    return ((x % divisor) + divisor) % divisor
}