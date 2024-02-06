
import * as THREE from "three"

interface Disposible {
    dispose: () => void
}

type Trackable = THREE.Object3D | THREE.Material | THREE.BufferGeometry

/**
 * Track resources and dispose of unused ones.
 * 
 * Together with Object3DCache, this allows you to dramatically reduce the WebGL
 * objects that are allocated and disposed. For example:
 * 
 *     const scene = new THREE.scene()
 *     const resourceTracker = new ResourceTracker()
 *     const objectCache = new Object3DCache()
 *     function update() {
 *         objectCache.newScene()
 *         resourceTracker.markUnused(scene)
 *
 *         // Update scene here, optionally using `scene.clear()`.
 *         // Use objectCache to get previously used values.
 *         
 *         resourceTracker.markUsed(scene)
 *         resourceTracker.releaseUnused()
 *     }
 */
export class ResourceTracker {
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

/**
 * Cache objects, with a timeout after an object hasn't been used in a number
 * of scene changes.
 */
export class Object3DCache {
    private cache: Map<string, {
        obj: THREE.Object3D,
        scenesSinceUsed: number,
    }>
    stats: {
        hits: number,
        misses: number,
        expired: number,
    }
    
    /* Number of scene changes in which an object is unused before it is disposed. */
    sceneTimeout: number
    
    constructor(sceneCountTimeout: number=4) {
        this.cache = new Map()
        this.sceneTimeout = sceneCountTimeout
        this.stats = {
            hits: 0,
            misses: 0,
            expired: 0,
        }
    }

    set(key: string, obj: THREE.Object3D) {
        this.cache.set(key, {obj, scenesSinceUsed: 0})
    }

    get(key: string): THREE.Object3D | null {
        const entry = this.cache.get(key)
        if(entry === undefined) {
            this.stats.misses++
            return null
        }
        this.stats.hits++
        entry.scenesSinceUsed = 0
        return entry.obj
    }
    
    getOrSet(key: string, produceValue: () => THREE.Object3D) {
        let value = this.get(key)
        if(value === null) {
            value = produceValue()
            this.set(key, value)
        }
        return value
    }
    
    clear() {
        this.cache.clear()
    }
    
    newScene() {
        for(const [key, entry] of this.cache.entries()) {
            entry.scenesSinceUsed++;
            if(entry.scenesSinceUsed > this.sceneTimeout) {
                this.cache.delete(key)
                this.stats.expired++
            }
        }
    }
    
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            expired: 0,
        }
    }
}