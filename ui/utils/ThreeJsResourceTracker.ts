
import * as THREE from "three"

interface Disposible {
    dispose: () => void
}

type Trackable = THREE.Object3D | THREE.Material | THREE.BufferGeometry

/**
 * Track resources and dispose of unused ones. This prevents you from having to
 * manually call .dispose() on objects in three.js which normally need to be
 * manually tracked to avoid a memory leak.
 * 
 * Example:
 *
 *     const scene = new THREE.scene()
 *     const resourceTracker = new ResourceTracker()
 *     function update() {
 *         resourceTracker.markUnused(scene)
 *
 *         // Update scene here, optionally using `scene.clear()`.
 *
 *         resourceTracker.markUsed(scene)
 *         resourceTracker.releaseUnused()
 *     }
 */
export class ThreeJsResourceTracker {
    used: Set<Disposible>
    unused: Set<Disposible>

    constructor() {
        this.used = new Set()
        this.unused = new Set()
    }

    private *iterResources(objOrObjs: Trackable | Trackable[]): Iterable<Disposible> {
        const stack: Array<Trackable | Trackable[]> = [objOrObjs]
        while(stack.length) {
            const obj = stack.pop()
            if(Array.isArray(obj)) {
                stack.push(...obj)
                continue
            }

            if(obj instanceof THREE.Light) {
                yield obj
            } else if(obj instanceof THREE.AxesHelper) {
                yield obj
            } else if(obj instanceof THREE.BufferGeometry) {
                yield obj

            } else if(obj instanceof THREE.InstancedMesh) {
                stack.push(obj.material)
                stack.push(obj.geometry)
                obj.dispose()

            } else if(obj instanceof THREE.Object3D) {
                stack.push(...obj.children)

                // Material and Geometry properties of Mesh and Line classes.
                const objWithResources = obj as typeof obj & {
                    material?: THREE.Material,
                    geometry?: THREE.BufferGeometry,
                    dispose: () => void,
                }
                if((objWithResources).material) {
                    stack.push(objWithResources.material)
                }
                if(objWithResources.geometry) {
                    stack.push(objWithResources.geometry)
                }

                if((objWithResources).dispose !== undefined) {
                    throw new Error("Unknown object with dispose method " + obj)
                }

            } else if(obj instanceof THREE.Material) {
                yield obj
                /* Don't support textures, since we don't use them, and iterating over all attributes is slow.
                for (const value of Object.values(obj)) {
                    if (value instanceof THREE.Texture) {
                        yield value
                    }
                }
                if((objWithResources).uniforms) {
                    throw new Error("Uniforms non supported")
                }
                */

            } else {
                throw new Error("Unknown 3d object " + obj)
            }
        }
    }

    markUsed(obj: Trackable) {
        for(const resource of this.iterResources(obj)) {
            this.used.add(resource)
            this.unused.delete(resource)
        }
    }

    markUnused(obj: Trackable) {
        for(const resource of this.iterResources(obj)) {
            this.used.delete(resource)
            this.unused.add(resource)
        }
    }

    releaseUnused() {
        for(const resource of this.unused) {
            resource.dispose()
        }
        this.unused.clear()
    }

    releaseAll() {
        for(const resource of this.unused) {
            resource.dispose()
        }
        for(const resource of this.used) {
            resource.dispose()
        }
        this.unused.clear()
        this.used.clear()
    }
}