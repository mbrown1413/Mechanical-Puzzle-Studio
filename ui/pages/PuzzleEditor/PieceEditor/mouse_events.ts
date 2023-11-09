import { Ref, onMounted, ComputedRef } from "vue"

import * as THREE from "three"
import {Vector2} from "three"

import {Piece} from "~lib/Puzzle.ts"
import {Coordinate} from "~lib/types.ts"
import {arraysEqual} from "~lib/tools.ts"
import {Action, EditPieceAction} from "~ui/actions.ts"

export function useMouseEventsComposible(
    // Inputs
    piece: ComputedRef<Piece | null>,
    renderer: THREE.Renderer,
    camera: THREE.Camera,
    hitTestObjects: Ref<THREE.Object3D[]>,

    // Output
    actionCallback: (action: Action) => void,
    highlightedCoordinate: Ref<Coordinate | null>,
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

    /* Set highlightedCoordinate based on object at screen position x, y. */
    function highlightObjectAtPosition(x: number, y: number) {
        const intersectedObject = getObjectOnScreen(x, y)
        if(intersectedObject) {
            const newValue = intersectedObject.userData.coordinate
            // Only update if changed
            if(!Array.isArray(highlightedCoordinate.value) || !arraysEqual(highlightedCoordinate.value, newValue)) {
                highlightedCoordinate.value = newValue
            }
        } else {
            highlightedCoordinate.value = null
        }
    }

    function clearHighlight() {
        highlightedCoordinate.value = null
    }

    /* Emit appropriate action (via actionCallback) for clicking on the object
    * at the given position and click type in the event. */
    function clickObject(event: MouseEvent) {
        if(piece.value === null) return
        const intersectedObject = getObjectOnScreen(event.clientX, event.clientY)
        if(intersectedObject) {
            let toAdd: Coordinate[] = []
            let toRemove: Coordinate[] = []
            if(event.ctrlKey || event.button === 2) {
                toRemove = [intersectedObject.userData.coordinate]
            } else {
                toAdd = [intersectedObject.userData.coordinate]
            }
            actionCallback(new EditPieceAction(piece.value.id, toAdd, toRemove))
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
            let distSquared = (
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