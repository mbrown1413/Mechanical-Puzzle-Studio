import {Ref, watch} from "vue"

import * as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"

import {Grid, Voxel, Bounds, Viewpoint} from "~lib"
import {makeAxesHelper} from "~/ui/utils/threejs-objects.ts"

export type CameraSchemeName = "2D" | "3D"

export abstract class CameraScheme {
    requestRender: () => void
    bounds: Ref<Bounds>
    gridBoundingBox: Ref<THREE.Box3>
    viewpoint: Ref<Viewpoint>
    layerN: Ref<number>

    controls?: OrbitControls

    constructor(
        requestRender: () => void,
        bounds: Ref<Bounds>,
        gridBoundingBox: Ref<THREE.Box3>,
        viewpoint: Ref<Viewpoint>,
        layerN: Ref<number>,
    ) {
        this.requestRender = requestRender,
        this.viewpoint = viewpoint
        this.bounds = bounds
        this.gridBoundingBox = gridBoundingBox
        this.layerN = layerN
    }

    abstract get camera(): THREE.Camera

    /**
     * Start listening to mouse/keyboard events to control camera movement.
     */
    enable(element: HTMLElement) {
        if(!this.controls) {
            this.controls = new OrbitControls(this.camera, element)
            this.controls.addEventListener("change", this.requestRender)
            this.setCameraTarget()
        }
        this.controls.enabled = true
    }

    /**
     * Stop listening to mouse/keyboard events.
     */
    disable() {
        if(this.controls) {
            this.controls.enabled = false
        }
    }

    /**
     * An opportunity to add objects to the scene specific to
     */
    addObjects(_scene: THREE.Scene) {}

    /**
     * Iterate over all voxels which should be considered for displaying when
     * this camera scheme is active.
     */
    iterVoxels(grid: Grid): Iterable<Voxel> {
        return grid.getVoxels(this.bounds.value)
    }

    /**
     * An opportunity to change camera parameters before every render.
     */
    beforeRender(
        _scene: THREE.Scene,
        _screenWidth: number,
        _screenHeight: number
    ) {}

    dispose() {
        this.controls?.dispose()
    }

    abstract getCameraDistance(boundingSphere: THREE.Sphere): number

    calculateNearFar(scene: THREE.Scene): {near: number, far: number} {
        const boundingBox = new THREE.Box3().setFromObject(scene)
        const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere())
        const sphereDistance = boundingSphere.distanceToPoint(this.camera.position)
        return {
            near: Math.max(sphereDistance * .9, 0.1),
            far: (sphereDistance + boundingSphere.radius*2) * 1.1
        }
    }

    setCameraPosition() {
        const center = this.gridBoundingBox.value.getCenter(new THREE.Vector3())

        const boundingSphere = this.gridBoundingBox.value.getBoundingSphere(new THREE.Sphere())
        const cameraPosition = this.viewpoint.value.forwardVector.clone().normalize()
        cameraPosition.multiplyScalar(
            -1 * this.getCameraDistance(boundingSphere)
        )
        cameraPosition.add(center)
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    }

    setCameraTarget() {
        const center = this.gridBoundingBox.value.getCenter(new THREE.Vector3())
        this.camera.lookAt(center)
        if(this.controls) {
            this.controls.target = center
        }
    }
}

export class ThreeDimensionalCameraScheme extends CameraScheme {
    fovRadians: number
    camera: THREE.PerspectiveCamera

    constructor(
        requestRender: () => void,
        bounds: Ref<Bounds>,
        gridBoundingBox: Ref<THREE.Box3>,
        viewpoint: Ref<Viewpoint>,
        layerN: Ref<number>,
    ) {
        super(requestRender, bounds, gridBoundingBox, viewpoint, layerN)

        const fovDegrees = 75
        this.fovRadians = fovDegrees * (Math.PI/180)
        this.camera = new THREE.PerspectiveCamera(fovDegrees, 2, 0.1, 10)

        this.setCameraPosition()

        watch(this.gridBoundingBox, () => {
            this.setCameraTarget()
        }, {immediate: true})
    }

    addObjects(scene: THREE.Scene) {
        const gridBoxSize = this.gridBoundingBox.value.getSize(new THREE.Vector3())
        const axesHelper = makeAxesHelper(
            gridBoxSize.x + 1,
            gridBoxSize.y + 1,
            gridBoxSize.z + 1,
        )
        axesHelper.position.set(-1, -1, -1)
        scene.add(axesHelper)
    }

    getCameraDistance(boundingSphere: THREE.Sphere): number {
        return (boundingSphere.radius * 1.2) / Math.tan(this.fovRadians / 2)
    }

    beforeRender(scene: THREE.Scene, screenWidth: number, screenHeight: number) {
        this.camera.aspect = screenWidth / screenHeight

        const {near, far} = this.calculateNearFar(scene)
        this.camera.near = near
        this.camera.far = far

        this.camera.updateProjectionMatrix()
    }
}

export class TwoDimensionalCameraScheme extends CameraScheme {
    camera: THREE.OrthographicCamera

    constructor(
        requestRender: () => void,
        bounds: Ref<Bounds>,
        gridBoundingBox: Ref<THREE.Box3>,
        viewpoint: Ref<Viewpoint>,
        layerN: Ref<number>,
    ) {
        super(requestRender, bounds, gridBoundingBox, viewpoint, layerN)
        this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 10)

        watch([this.bounds, this.gridBoundingBox, this.viewpoint], () => {
            this.setCameraPosition()
            this.setCameraTarget()
            this.requestRender()
        }, {immediate: true})
    }

    enable(element: HTMLElement) {
        CameraScheme.prototype.enable.call(this, element)
        if(this.controls) {
            this.controls.enableRotate = false
        }
    }

    getCameraDistance(boundingSphere: THREE.Sphere): number {
        return (boundingSphere.radius * 1.5)
    }

    setCameraSides(screenWidth: number, screenHeight: number) {
        let width: number, height: number
        const boundingSphere = this.gridBoundingBox.value.getBoundingSphere(new THREE.Sphere())
        if(screenWidth < screenHeight) {
            width = boundingSphere.radius * 2
            height = width / screenWidth * screenHeight
        } else {
            height = boundingSphere.radius * 2
            width = height / screenHeight * screenWidth
        }
        this.camera.left = -width / 2
        this.camera.right = width / 2
        this.camera.top = height / 2
        this.camera.bottom = -height / 2
    }

    *iterVoxels(grid: Grid): Iterable<Voxel> {
        for(const voxel of grid.getVoxels(this.bounds.value)) {
            if(this.viewpoint.value.isInLayer(voxel, this.layerN.value)) {
                yield voxel
            }
        }
    }

    beforeRender(scene: THREE.Scene, screenWidth: number, screenHeight: number) {
        this.setCameraSides(screenWidth, screenHeight)

        const {near, far} = this.calculateNearFar(scene)
        this.camera.near = near
        this.camera.far = far

        this.camera.updateProjectionMatrix()
    }
}