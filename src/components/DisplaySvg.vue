<script setup lang="ts">
import { computed, ref, Ref, watch, nextTick } from "vue"

import { Coordinate, Point2d, Point3d, Viewpoint } from "../types.ts"
import { Grid } from "../grid.ts"
import { Piece } from  "../puzzle.ts"
import { pointsToSvgSpace, projectPointsToPlane, pointsToSvgPolygonFormat } from '../vector_tools.ts'
import VerticalSlider from "./VerticalSlider.vue"

type AnimationState = {
    oldViewpoint: Viewpoint,
    oldViewbox: string,
}

const props = defineProps<{
    grid: Grid,
    piece: Piece,
}>()

// Constants
const viewpoints = props.grid.getViewpoints()
const animationDuration = 1  // Seconds

// Input elements in template
const currentViewpointId = ref(viewpoints[0].id)
const layerN = ref(0)

// Other state variables
const svgElement: Ref<HTMLElement | null> = ref(null)
const animation: Ref<AnimationState | null> = ref(null)

const currentViewpoint = computed(() =>
  viewpoints.find(v => v.id === currentViewpointId.value)
)

/* Track which layer each viewpoint was last on, and
 * return to that layer when going back to the viewpoint. */
let layerByViewpoint: {[key: string]: number} = {}
watch(layerN, () => {
    if(currentViewpoint.value !== undefined) {
        layerByViewpoint[currentViewpoint.value.id] = layerN.value
    }
})
watch(currentViewpoint, (newViewpoint) => {
    if(newViewpoint !== undefined) {
        layerN.value = layerByViewpoint[newViewpoint.id]
    }
    if(layerN.value === undefined) {
        layerN.value = 0
    }
})

const polygonsToDraw = computed(() => {
    if(currentViewpoint.value === undefined) {
        return []
    }

    let allCoordinates = props.grid.getCoordinates()

    let ret = []
    for(let coordinate of allCoordinates) {
        let info = props.grid.getCellInfo(coordinate)
        for(let [side, points] of Object.entries(info.sidePolygons)) {

            let isBold, opacity
            if(layerHasCoordinate(coordinate)) {
                isBold = 0.01
                if(coordinateHasPiece(coordinate)) {
                    opacity = 1
                } else {
                    opacity = 0
                }
            } else {
                isBold = 0.005
                if(coordinateHasPiece(coordinate)) {
                    opacity = .25
                } else {
                    opacity = 0
                }
            }

            ret.push({
                points: points,
                coordinate: coordinate,
                side: side,

                stroke: "black",
                strokeWidth: isBold ? 0.01 : 0.005,
                fill: "black",
                fillOpacity: opacity,
            })
        }
    }
    return ret
})

function doProjection(viewpoint: Viewpoint, points: Point3d[]): Point2d[] {
    return pointsToSvgSpace(
        projectPointsToPlane(
            viewpoint.forwardVector,
            viewpoint.xVector,
            ...points
        )
    )
}

function layerHasCoordinate(coordinate: Coordinate) {
    let layerCoordinates = props.grid.getViewpointLayer(
        currentViewpointId.value,
        Number(layerN.value)
    )

    let cordToStr = (cord: Coordinate) => cord.join(",")
    let coordSet: Set<string> = new Set(layerCoordinates.map(cordToStr))
    return coordSet.has(cordToStr(coordinate))
}

function coordinateHasPiece(coordinate: Coordinate) {
    let cordToStr = (cord: Coordinate) => cord.join(",")
    let coordSet: Set<string> = new Set(props.piece.coordinates.map(cordToStr))
    return coordSet.has(cordToStr(coordinate))
}

const bounds = computed(() => {
    // Collect all X and Y values
    let xs = []
    let ys = []
    for(let polygon of polygonsToDraw.value) {
        let points = []
        if(currentViewpoint.value) {
            points.push(...doProjection(currentViewpoint.value, polygon.points))
        }
        /*
        if(oldViewpoint.value) {
            points.push(...doProjection(oldViewpoint.value, polygon.points))
        }
        */
        for(let point of points) {
            xs.push(point[0])
            ys.push(point[1])
        }
    }

    // Min/max with sanity checks in case there are no xs/ys. This can happen if
    // a layer is selected which is out of bounds in the seleted viewpoint.
    return {
        minX: xs.length === 0 ? 0 : Math.min(...xs),
        maxX: xs.length === 0 ? 0 : Math.max(...xs),
        minY: ys.length === 0 ? 0 : Math.min(...ys),
        maxY: ys.length === 0 ? 0 : Math.max(...ys),
    }
})

const viewBox = computed(() => {
    let width = bounds.value.maxX - bounds.value.minX
    let height = bounds.value.maxY - bounds.value.minY
    let margin = Math.max(width*0.1, height*0.1)
    return (
        (bounds.value.minX - margin) + " " +
        (bounds.value.minY - margin) + " " +
        (width + 2*margin) + " " +
        (height + 2*margin)
    )
})

/* Start new animation when viewpoint changes. */
watch([currentViewpoint, viewBox], (_, [oldViewpoint, oldViewbox]) => {
    // Save old projection information so we can animate the transition from
    // old to new viewpoint.
    if(oldViewpoint !== undefined && oldViewbox !== undefined) {
        animation.value = {
            oldViewpoint: oldViewpoint,
            oldViewbox: oldViewbox,
        }
    }

    // Trigger SVG animations to begin
    // This is necessary because the SVG didn't just load, and we added
    // <animate> elements.
    nextTick(() => {
        if(svgElement.value !== null) {
            let animateElements = svgElement.value.getElementsByTagName("animate")
            for(let animate of animateElements) {
                animate.beginElement()
            }
        }
    })
    
    // Remove our internal animation state when animations are complete.
    setTimeout(() => {
        animation.value = null
    }, animationDuration * 1000)
})

</script>

<template>
    <div class="display2d" ref="svgElement">

        <div class="controls">
            <select v-model="currentViewpointId" :disabled="animation !== null">
                <option
                    v-for="viewpoint in viewpoints"
                    :value="viewpoint.id"
                >
                    {{ viewpoint.name }}
                </option>
            </select>
        </div>

        <VerticalSlider
            class="slider"
            v-if="currentViewpoint !== undefined && currentViewpoint.nLayers > 1"
            v-model="layerN"
            :options="[...Array(currentViewpoint.nLayers).keys()]"
        />

        <svg
            class="grid"
            :viewBox="animation ? '' : viewBox"
            xmlns="http://www.w3.org/2000/svg"
        >
        
            <animate
                v-if="animation"
                attributeName="viewBox"
                :dur="animationDuration + 's'"
                repeatCount="1"
                :from="animation.oldViewbox"
                :to="viewBox"
            />

            <polygon
                v-if="currentViewpoint"
                v-for="polygon in polygonsToDraw"
                :points="pointsToSvgPolygonFormat(doProjection(currentViewpoint, polygon.points))"
                :stroke="polygon.stroke"
                :stroke-width="polygon.strokeWidth"
                :fill="polygon.fill"
                :fill-opacity="polygon.fillOpacity"
            >
                <animate
                    v-if="animation"
                    attributeName="points"
                    :dur="animationDuration + 's'"
                    repeatCount="1"
                    :from="pointsToSvgPolygonFormat(doProjection(animation.oldViewpoint, polygon.points))"
                    :to="pointsToSvgPolygonFormat(doProjection(currentViewpoint, polygon.points))"
                />
            </polygon>
        </svg>

    </div>
</template>

<style scoped>
.display2d {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template:
        "controls controls" min-content
        "slider   grid"    1fr
        / min-content 1fr ;
}
.controls {
    grid-area: controls;
}
.slider {
    grid-area: slider;
}
.grid {
    grid-area: grid;
}
</style>