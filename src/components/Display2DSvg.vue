<script setup lang="ts">
import { computed, ref } from 'vue'

import { makeUniqueId } from "../tools.ts"
import { Coordinate, Point2d } from "../types.ts"
import { Grid } from "../grid.ts"
import { Piece } from  "../puzzle.ts"
import { pointsToSvgSpace, projectPointsToPlane, pointsToSvgPolygonFormat } from '../vector_tools.ts'

const props = defineProps<{
  grid: Grid,
  piece: Piece,
}>()

// Constants for use in template
const viewpoints = props.grid.getViewpoints()
const viewpointInputId = makeUniqueId()
const layerInputId = makeUniqueId()
const layerListId = makeUniqueId()

// Input elements in template
const currentViewpointId = ref(viewpoints[0].id)
const layerN = ref(0)

const currentViewpoint = computed(() =>
  viewpoints.find(v => v.id === currentViewpointId.value)
)

const layerCoordinates = computed(() => 
  props.grid.getViewpointLayer(
    currentViewpointId.value,
    Number(layerN.value)
  )
)

const allPolygons = computed(() => {
  if(currentViewpoint.value === undefined) {
    return []
  }
  let ret: Point2d[][] = []
  let forwardVector = currentViewpoint.value.forwardVector
  let xVector = currentViewpoint.value.xVector
  for(let coordinate of layerCoordinates.value) {
    let info = props.grid.getCellInfo(coordinate)
    let polygons = Object.values(info.sidePolygons).map((polygon) =>
      pointsToSvgSpace(projectPointsToPlane(forwardVector, xVector, ...polygon))
    )
    ret.push(...polygons)
  }
  return ret
})

function getPolygonsForCoordinate(coordinate: Coordinate): Point2d[][] {
  if(currentViewpoint.value === undefined) {
    return []
  }
  let ret: Point2d[][] = []
  let forwardVector = currentViewpoint.value.forwardVector
  let xVector = currentViewpoint.value.xVector
  let info = props.grid.getCellInfo(coordinate)
  let polygons = Object.values(info.sidePolygons).map((polygon) =>
    pointsToSvgSpace(projectPointsToPlane(forwardVector, xVector, ...polygon))
  )
  ret.push(...polygons)
  return ret
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
  for(let polygon of allPolygons.value) {
    for(let point of polygon) {
      xs.push(point[0])
      ys.push(point[1])
    }
  }

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
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

</script>

<template>
  <div class="display2d">
    
    <label :for="viewpointInputId">View: </label>
    <select
      :id="viewpointInputId"
      v-model="currentViewpointId"
    >
      <option
          v-for="viewpoint in viewpoints"
          :value="viewpoint.id"
      >
        {{ viewpoint.name }}
      </option>
    </select>
    <br />

    <label :for="layerInputId">Layer:</label><br />
    <input
      :id="layerInputId"
      v-model="layerN"
      type="range"
      min="0"
      :max="currentViewpoint.nLayers-1"
      :list="layerListId"
    />
    <datalist :id="layerListId">
      <option
        v-for="i in [...Array(currentViewpoint.nLayers).keys()]"
        :value="i"
        :label="i.toString()"
      ></option>
    </datalist>

    <svg
      :viewBox="viewBox"
      xmlns="http://www.w3.org/2000/svg"
    >
      <template v-for="coordinate in layerCoordinates">
          <polygon
            v-for="polygon in getPolygonsForCoordinate(coordinate)"
            :points="pointsToSvgPolygonFormat(polygon)"
            stroke="black"
            stroke-width="0.01"
            :fill-opacity="coordinateHasPiece(coordinate) ? 0.25 : 0"
            @click="console.log('Clicked!' + polygon)"
          />
        </template>
    </svg>
  </div>
</template>

<style scoped>
.display2d {
  width: 100%;
  height: 100%;
}

/* Layer slider */
datalist {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: calc(100% - 4em);
  margin-left: 2em;
  margin-right: 2em;
}
option {
  padding: 0;
}
input[type="range"] {
  width: calc(100% - 4em);
  margin: 0;
  margin-left: 2em;
  margin-right: 2em;
}

</style>