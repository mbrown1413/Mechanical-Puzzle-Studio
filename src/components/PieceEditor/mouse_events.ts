import { Ref, onMounted, ComputedRef } from "vue"

import * as THREE from "three"
import { Vector2 } from "three"

import { Piece } from "../../puzzle.ts"
import { Action, EditPieceAction } from "../../actions.ts"
import { Coordinate } from "../../types.ts"
import { arraysEqual } from "../../tools.ts"

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

    function onMouseMove(event: MouseEvent) {
        const intersectedObject = getObjectOnScreen(event.clientX, event.clientY)
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

    function onMouseOut() {
        highlightedCoordinate.value = null
    }
    
    function onClick(event: MouseEvent) {
        if(piece.value === null) return
        const intersectedObject = getObjectOnScreen(event.clientX, event.clientY)
        if(intersectedObject) {
            let toAdd: Coordinate[] = []
            let toRemove: Coordinate[] = []
            console.log("BUTTON:", event.button)
            if(event.ctrlKey) {
                toRemove = [intersectedObject.userData.coordinate]
            } else {
                toAdd = [intersectedObject.userData.coordinate]
            }
            actionCallback(new EditPieceAction(piece.value.id, toAdd, toRemove))
        }
    }

    onMounted(() => {
        renderer.domElement.addEventListener("mousemove", onMouseMove);
        renderer.domElement.addEventListener("mouseout", onMouseOut);
        renderer.domElement.addEventListener("mouseleave", onMouseOut);
        renderer.domElement.addEventListener("click", onClick);
        //TODO: Touch events
        //renderer.domElement.addEventListener("touchstart", onTouch);
    })
}