import {BufferGeometry, Vector3, Shape, ShapeGeometry} from "three"

import {registerClass} from "~/lib/serialize.ts"
import {Grid, Voxel, Viewpoint, Transform, VoxelInfo} from "~/lib/Grid.ts"
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
        this.nDivisions = 8
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
        const {rho, zed} = this.voxelToCoordinate(voxel)
        return (
            rho >= (bounds.rho || 0) && rho < (bounds.rho || 0) + bounds.rhoSize &&
            zed >= (bounds.zed || 0) && zed < (bounds.zed || 0) + bounds.zedSize
        )
    }

    getVoxelBounds(...voxels: Voxel[]): CylindricalBounds {
        if(voxels.length === 0) {
            return this.getDefaultPieceBounds()
        }
        const min = this.voxelToCoordinate(voxels[0])
        const max = this.voxelToCoordinate(voxels[0])
        for(const voxel of voxels) {
            const {rho, zed} = this.voxelToCoordinate(voxel)
            min.rho = Math.min(min.rho, rho)
            min.zed = Math.min(min.zed, zed)
            max.rho = Math.max(max.rho, rho)
            max.zed = Math.max(max.zed, zed)
        }
        return {
            rho: min.rho, zed: min.zed,
            rhoSize: max.rho - min.rho + 1,
            zedSize: max.zed - min.zed + 1,
        }
    }

    validateVoxel(voxel: Voxel): boolean {
        try {
            this.voxelToCoordinate(voxel)
        } catch {
            return false
        }
        return true
    }

    getBoundsMax(...bounds: CylindricalBounds[]): CylindricalBounds {
        if(bounds.length === 0) {
            return this.getDefaultPieceBounds()
        }
        const min = {
            rho: bounds[0].rho || 0,
            phi: bounds[0].phi || 0,
            zed: bounds[0].zed || 0
        }
        const max = Object.assign({}, min)
        for(const bound of bounds) {
            min.rho = Math.min(min.rho, bound.rho || 0)
            min.phi = Math.min(min.phi, bound.phi || 0)
            min.zed = Math.min(min.zed, bound.zed || 0)
            max.rho = Math.max(max.rho, (bound.rho || 0) + bound.rhoSize)
            max.phi = Math.max(max.phi, (bound.phi || 0) + (bound.phiSize || this.nDivisions))
            max.zed = Math.max(max.zed, (bound.zed || 0) + bound.zedSize)
        }
        return {
            ...min,
            rhoSize: max.rho - min.rho,
            phiSize: max.phi - min.phi,
            zedSize: max.zed - min.zed,
        }
    }

    getBoundsOrigin(bounds: CylindricalBounds): Voxel {
        return this.coordinateToVoxel({
            rho: bounds.rho || 0,
            phi: 0,
            zed: bounds.zed || 0
        })
    }

    getVoxelInfo(voxel: Voxel): VoxelInfo {
        const sides = [
            "+rho", "+phi", "-phi", "+zed", "-zed"
        ]

        if(this.voxelToCoordinate(voxel).phi !== 0) {
            sides.push("-rho")
        }
        return {voxel, sides}
    }

    getVoxels(bounds: CylindricalBounds): Voxel[] {
        const ret = []
        const rhoMin = bounds.rho || 0
        const phiMin = bounds.phi || 0
        const zedMin = bounds.zed || 0
        const rhoMax = rhoMin + bounds.rhoSize
        const phiMax = phiMin + (bounds.phiSize || this.nDivisions)
        const zedMax = zedMin + bounds.zedSize
        for(let rho=rhoMin; rho < rhoMax; rho++) {
            for(let phi=rhoMin; phi < phiMax; phi++) {
                for(let zed=zedMin; zed < zedMax; zed++) {
                    ret.push(this.coordinateToVoxel({
                        rho,
                        phi: phi % this.nDivisions,
                        zed
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
        const bottomZ = this.getLayerBottomZ(zed)
        const topZ = this.getLayerTopZ(zed)

        const innerStartX = Math.cos(thetaStart) * innerRadius
        const innerStartY = Math.sin(thetaStart) * innerRadius
        const innerEndX = Math.cos(thetaEnd) * innerRadius
        const innerEndY = Math.sin(thetaEnd) * innerRadius
        const outerStartX = Math.cos(thetaStart) * outerRadius
        const outerStartY = Math.sin(thetaStart) * outerRadius
        const outerEndX = Math.cos(thetaEnd) * outerRadius
        const outerEndY = Math.sin(thetaEnd) * outerRadius

        let wireframe: Vector3[]
        let solid: BufferGeometry

        if(coord === "rho") {
            const startX = polarity === "-" ? innerStartX : outerStartX
            const startY = polarity === "-" ? innerStartY : outerStartY
            const endX = polarity === "-" ? innerEndX : outerEndX
            const endY = polarity === "-" ? innerEndY : outerEndY

            const points: [Vector3, Vector3, Vector3, Vector3] = [
                new Vector3(startX, startY, bottomZ),
                new Vector3(startX, startY, topZ),
                new Vector3(endX, endY, topZ),
                new Vector3(endX, endY, bottomZ),
            ]
            wireframe = points
            solid = makeRectGeometry(...points)

        } else if(coord === "phi") {
            const innerX = polarity === "-" ? innerStartX : innerEndX
            const innerY = polarity === "-" ? innerStartY : innerEndY
            const outerX = polarity === "-" ? outerStartX : outerEndX
            const outerY = polarity === "-" ? outerStartY : outerEndY

            const points: [Vector3, Vector3, Vector3, Vector3] = [
                new Vector3(innerX, innerY, bottomZ),
                new Vector3(innerX, innerY, topZ),
                new Vector3(outerX, outerY, topZ),
                new Vector3(outerX, outerY, bottomZ),
            ]
            wireframe = points
            solid = makeRectGeometry(...points)

        } else if(coord === "zed") {
            const z = polarity === "-" ? bottomZ : topZ

            const innerStart = new Vector3(innerStartX, innerStartY, z)
            const innerEnd = new Vector3(innerEndX, innerEndY, z)
            const outerStart = new Vector3(outerEndX, outerEndY, z)
            const outerEnd = new Vector3(outerStartX, outerStartY, z)
            wireframe = [innerStart, innerEnd, outerStart, outerEnd]

            const shape = new Shape()
            shape.moveTo(innerStartX, innerStartY)
            shape.lineTo(innerEndX, innerEndY)
            shape.lineTo(outerEndX, outerEndY)
            shape.lineTo(outerStartX, outerStartY)
            solid = new ShapeGeometry(shape)
            solid.translate(0, 0, z)

        } else {
            throw new Error(`Unrecognized direction "${direction}"`)
        }
        return {solid, wireframe}
    }

    doTransform(transform: Transform, voxels: Voxel[]): Voxel[] {
    }

    scaleTransform(transform: Transform, amount: number): Transform {
    }

    getRotations(includeMirrors: boolean): Transform[] {
    }

    getTranslation(from: Voxel, to: Voxel): Transform {
    }

    getDisassemblyTransforms(): Transform[] {
    }

    isSeparate(group1: Voxel[], group2: Voxel[]): boolean {
    }

    getViewpoints(): Viewpoint[] {
        return [
            {
                id: "+zed",
                name: "Above",
                forwardVector: new Vector3(0, 0, -1),
                xVector: new Vector3(1, 0, 0),
                getNLayers(bounds: CylindricalBounds) { return bounds.zedSize },
                isInLayer: (voxel, layerIndex) => this.voxelToCoordinate(voxel).zed == layerIndex,
            }
        ]
    }
}

registerClass(CylindricalGrid)