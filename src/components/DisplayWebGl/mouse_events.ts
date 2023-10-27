import { Ref, onMounted } from "vue"

import * as THREE from "three"
import { Vector2 } from "three"

import { Coordinate } from "../../types.ts"
import { arraysEqual } from "../../tools.ts"

export function useMouseEventsComposible(
    // Inputs
    renderer: THREE.Renderer,
    camera: THREE.Camera,
    hitTestObjects: Ref<THREE.Object3D[]>,
    
    // Output
    highlightedCoordinate: Ref<Coordinate | null>,
) {
    const raycaster = new THREE.Raycaster()

    function onMouseMove(event: MouseEvent) {
        const canvas = renderer.domElement
        const rect = canvas.getBoundingClientRect()
        const pickPosition = new Vector2(
            (event.clientX - rect.left) / rect.width * 2 - 1,
            (event.clientY - rect.top) / rect.height * -2 + 1,
        )
        raycaster.setFromCamera(pickPosition, camera)
        const intersects = raycaster.intersectObjects(hitTestObjects.value)

        if(intersects.length) {
            const newValue = intersects[0].object.userData.coordinate
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

    onMounted(() => {
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseout', onMouseOut);
        renderer.domElement.addEventListener('mouseleave', onMouseOut);
    })
}