import * as THREE from "three"

type RenderArea = {
    renderFunc: (renderer: THREE.WebGLRenderer) => void,
    element: HTMLElement,
}

/**
 * Render multiple three.js scenes with one <canvas> and one WebGL context.
 *
 * This is built to get around the limitation that browsers don't let you have
 * too many WebGL contexts open at once. It also allows sharing of graphics
 * resources between scenes. This is based on the three.js guide on [Multiple
 * Canvases, Multiple Scenes](https://threejs.org/manual/#en/multiple-scenes).
 *
 * A single <canvas> element is created which overlays the entire page. Render
 * areas are added to the MultiRenderer which specify an element to render
 * onto, and a render function. To render, the MultiRenderer looks at where
 * each render area's element is on the page and draws on the canvas on top of
 * it.
 * 
 * The canvas has a transparent background and a z-index above everything else.
 * If you want a background color, set that style on each render area's
 * element. You'll also need to listen to mouse events on the render area's
 * element (the canvas has pointer events turned off, so it's effectively only
 * a visual layer and clicks are passed through to elements underneeth it).
 */
class MultiRenderer {
    private _canvas: HTMLCanvasElement | null
    private _renderer: THREE.WebGLRenderer | null
    private renderAreas: {[areaId: string]: RenderArea}
    private areaIdCounter: number
    private needsRender: boolean
    private resizeObserver: ResizeObserver

    /* A single point of access for all event listeners, making removing event
     * listeners easy and conveniently binding `this`. */
    private requestRenderCallback: () => void

    constructor() {
        this._canvas = null
        this._renderer = null
        this.renderAreas = {}
        this.areaIdCounter = 0
        this.needsRender = false
        this.resizeObserver = new ResizeObserver(() => multiRenderer.requestRender())
        this.requestRenderCallback = () => this.requestRender()
    }

    get canvas(): HTMLCanvasElement {
        if(this._canvas === null) {
            this._canvas = document.createElement("canvas")
            this._canvas.style.position = "absolute"
            this._canvas.style.left = "0"
            this._canvas.style.top = "0"
            this._canvas.style.width = "100%"
            this._canvas.style.height = "100%"
            this._canvas.style.display = "block"
            this._canvas.style.zIndex = "1000"
            this._canvas.style.pointerEvents = "none"
            document.body.appendChild(this.canvas)
        }
        return this._canvas
    }
    get renderer(): THREE.WebGLRenderer {
        if(this._renderer === null) {
            this._renderer = new THREE.WebGLRenderer(
                {antialias: true, canvas: this.canvas}
            )
            this._renderer.setScissorTest(true)
        }
        return this._renderer
    }

    /**
     * Add an area to be rendered, returning an area ID used to reference it
     * later.
     */
    addRenderArea(
        element: HTMLElement,
        renderFunc: (renderer: THREE.WebGLRenderer) => void
    ): string {
        const areaId = String(this.areaIdCounter)
        this.renderAreas[areaId] = {renderFunc, element}
        this.addEventListeners(element)
        this.areaIdCounter++
        return areaId
    }

    removeRenderArea(areaId: string) {
        // To be sure we don't leave any event listeners hanging around, we
        // take the heavy-handed approach of removing all of them, then adding
        // only the ones needed after removing the given render area.
        this.removeAllEventListeners()
        delete this.renderAreas[areaId]
        this.addAllEventListeners()
        this.requestRender()
    }

    /**
     * Call if an area's scene or camera changes and needs to be re-rendered.
     *
     * You don't need to call this when the area element's size or location
     * changes, as MultiRenderer does this automatically.
     */
    requestRender() {
        this.needsRender = true
        requestAnimationFrame(() => this.render())
    }

    private addAllEventListeners() {
        for(const renderArea of Object.values(this.renderAreas)) {
            this.addEventListeners(renderArea.element)
        }
    }

    private addEventListeners(element: HTMLElement) {
        let e: HTMLElement | null = element
        while(e instanceof Element) {
            e.addEventListener("scroll", this.requestRenderCallback)
            this.resizeObserver.observe(e)
            e = e.parentElement
        }
    }

    private removeAllEventListeners() {
        this.resizeObserver.disconnect()
        for(const renderArea of Object.values(this.renderAreas)) {
            let e: HTMLElement | null = renderArea.element
            while(e instanceof Element) {
                e.removeEventListener("scroll", this.requestRenderCallback)
                e = e.parentElement
            }
        }
    }

    private render() {
        if(!this.needsRender) {
            return
        }
        this.needsRender = false

        // Resize renderer to screen
        const width = this.canvas.clientWidth
        const height = this.canvas.clientHeight
        const needResize = this.canvas.width !== width || this.canvas.height !== height
        if(needResize) {
            this.renderer.setSize(width, height, false)
        }

        // Clear whole canvas to transparent
		this.renderer.setScissorTest(false)
		this.renderer.setClearColor(new THREE.Color("#000"), 0)
		this.renderer.clear()

        // Draw each area on top of the area's element
		this.renderer.setScissorTest(true)
        for(const renderArea of Object.values(this.renderAreas)) {
            const rect = this.getElementRect(renderArea.element)
            if(!rect) { continue }
            const positiveYUpBottom = this.canvas.clientHeight - rect.bottom
            this.renderer.setScissor(rect.left, positiveYUpBottom, rect.width, rect.height)
            this.renderer.setViewport(rect.left, positiveYUpBottom, rect.width, rect.height)
            renderArea.renderFunc(this.renderer)
        }
    }

    /* Gets the rectangle of the element if it is visible on screen, or false
     * if it isn't visible. */
    private getElementRect(element: HTMLElement): false | DOMRect {
        if(element.offsetParent === null) {
            return false  // Element is hidden
        }

        const rect = element.getBoundingClientRect()
        const isOnScreen = (
            rect.bottom >= 0 &&
            rect.top < this.canvas.clientHeight &&
            rect.right >= 0 &&
            rect.left < this.canvas.clientWidth
        )
        if(isOnScreen) {
            return rect
        } else {
            return false
        }
    }
}

export const multiRenderer = new MultiRenderer()