import { Ref, onMounted} from "vue"

import * as THREE from "three"
import {Vector2} from "three"

import {Voxel} from "~lib"

export function useGridMouseComposible(
    // Inputs
    renderer: THREE.Renderer,
    camera: THREE.Camera,
    hitTestObjects: Ref<THREE.Object3D[]>,

    // Output
    clickCallback: (mouseEvent: MouseEvent, voxel: Voxel) => void,
    highlightedVoxel: Ref<Voxel | null>,
) {
    const raycaster = new THREE.Raycaster()
    
    /* from x, y position on screen (typically from a mouse event.clientX/Y)
     * get the object drawn at that location. */
    function getObjectOnScreen(x: number, y: number) {
        const canvas = renderer.domElement
        const rect = canvas.getBoundingClientRect()
        const pickPosition = new Vector2(
            (x - rect.left) / rect.width * 2 - 1,
            (y - rect.top) / rect.height * -2 + 1,
        )
        raycaster.setFromCamera(pickPosition, camera)
        const intersects = raycaster.intersectObjects(hitTestObjects.value)
        return intersects.length === 0 ? null : intersects[0].object
    }

    /* Set highlightedVoxel based on object at screen position x, y. */
    function highlightObjectAtPosition(x: number, y: number) {
        const intersectedObject = getObjectOnScreen(x, y)
        if(intersectedObject) {
            const newValue = intersectedObject.userData.voxel
            highlightedVoxel.value = newValue
        } else {
            highlightedVoxel.value = null
        }
    }

    function clearHighlight() {
        highlightedVoxel.value = null
    }

    /* Emit appropriate action (via actionCallback) for clicking on the object
    * at the given position and click type in the event. */
    function clickObject(event: MouseEvent) {
        const intersectedObject = getObjectOnScreen(event.clientX, event.clientY)
        if(intersectedObject) {
            clickCallback(
                event,
                intersectedObject.userData.voxel,
            )
        }
    }

    onMounted(() => {

        // Hovering to highlight
        renderer.domElement.addEventListener("mousemove", (event: MouseEvent) => {
            highlightObjectAtPosition(event.clientX, event.clientY)
        })
        renderer.domElement.addEventListener("mouseout", clearHighlight)
        renderer.domElement.addEventListener("mouseout", clearHighlight)

        // Click to modify piece
        // Track position of mousedown and if we move further than
        // mouseTolerance pixels away, consider it a drag and not a click.
        let mouseDownPosition: [number, number] | null = null
        const movementTolerance = 5  // Pixels
        renderer.domElement.addEventListener("mousedown", (event: MouseEvent) => {
            mouseDownPosition = [event.clientX, event.clientY]
        });
        renderer.domElement.addEventListener("mousemove", (event: MouseEvent) => {
            if(mouseDownPosition === null) return
            const distSquared = (
                (event.clientX - mouseDownPosition[0])**2 +
                (event.clientY - mouseDownPosition[1])**2
            )
            if(distSquared > movementTolerance**2) {
                mouseDownPosition = null
            }
        });
        renderer.domElement.addEventListener("mouseup", (event: MouseEvent) => {
            if(mouseDownPosition !== null) {
                clickObject(event)
            }
        });

        //TODO: Touch events
    })
}