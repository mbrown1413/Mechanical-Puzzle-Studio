import {Ref, onMounted} from "vue"
import debounce from "lodash.debounce"

import * as THREE from "three"
import {Vector2} from "three"

import {Voxel} from "~lib"

export function useGridDisplayMouseComposible(
    // Inputs
    element: Ref<HTMLElement>,
    camera: Ref<THREE.Camera>,
    hitTestObjects: Ref<THREE.Object3D[]>,

    // Output
    clickCallback: (mouseEvent: MouseEvent, voxel: Voxel) => void,
    highlightedVoxel: Ref<Voxel | null>,
) {
    const raycaster = new THREE.Raycaster()

    onMounted(() => {
        // Pixels of mouse movement before we consider it to be dragging, and
        // not just clicking on a voxel
        const movementTolerance = 5

        let state: "up" | "down" | "drag" = "up"
        let pressedPosition: [number, number] | null = null

        element.value.addEventListener("mousemove", (event: MouseEvent) => {
            if(state === "down" && pressedPosition) {
                // Have we moved enough from pressedPosition to be considered dragging?
                const distSquared = (
                    (event.clientX - pressedPosition[0])**2 +
                    (event.clientY - pressedPosition[1])**2
                )
                if(distSquared > movementTolerance**2) {
                    state = "drag"
                }
            }

            if(state === "drag") {
                highlightObjectDebounced(event.clientX, event.clientY)
            } else {
                highlightObject(event.clientX, event.clientY)
            }
        })

        element.value.addEventListener("mousedown", (event: MouseEvent) => {
            state = "down"
            pressedPosition = [event.clientX, event.clientY]
        })

        element.value.addEventListener("mouseup", (event: MouseEvent) => {
            if(state === "down") {
                clickObject(event)
            }
            highlightObject(event.clientX, event.clientY)
            state = "up"
            pressedPosition = null
        })

        element.value.addEventListener("mouseout", () => {
            highlightedVoxel.value = null
        })

    })

    /* Get the object at the given screen position */
    function getVoxelOnScreen(x: number, y: number): Voxel | null {
        const canvas = element.value
        const rect = canvas.getBoundingClientRect()
        const pickPosition = new Vector2(
            (x - rect.left) / rect.width * 2 - 1,
            (y - rect.top) / rect.height * -2 + 1,
        )
        raycaster.setFromCamera(pickPosition, camera.value)
        const intersects = raycaster.intersectObjects(hitTestObjects.value)
        if(intersects.length === 0) { return null }

        const voxel = intersects[0].object.userData.voxel
        if(voxel === undefined) { return null }
        return voxel
    }

    /* Set highlightedVoxel based on object at the given screen position */
    function highlightObject(x: number, y: number) {
        highlightedVoxel.value = getVoxelOnScreen(x, y)
    }

    const highlightObjectDebounced = debounce(
        highlightObject,
        50,
        {leading: false, trailing: true}
    )

    /* Find object at mouse position and call clickCallback */
    function clickObject(event: MouseEvent) {
        const voxel = getVoxelOnScreen(event.clientX, event.clientY)
        if(voxel) {
            clickCallback(event, voxel)
        }
    }

}