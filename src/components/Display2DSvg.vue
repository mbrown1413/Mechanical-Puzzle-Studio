<script setup lang="ts">
import { computed, ref } from 'vue'

import { Point } from "../types.ts"
import { Grid } from "../grid.ts"
import { Piece } from  "../puzzle.ts"

const props = defineProps<{
  grid: Grid,
  piece: Piece,
}>()

/**
 * Convert from the coordinate system we use to SVG's coordinate space.
 * 
 * In particular, the origin is changed from bottom-left to upper-left. This
 * may also change scale in the future.
 */
function polygonToSvgSpace(polygon: Point[]): Point[] {
  return polygon.map(([x, y, z]) => [x, -y, z])
}

const allPolygons = computed(() => {
  let ret: Point[][] = []
  for(let coordinate of props.piece.coordinates) {
    let info = props.grid.getCellInfo(coordinate)
    let polygons = Object.values(info.sidePolygons).map(polygonToSvgSpace)
    ret.push(...polygons)
  }
  return ret
})

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

/**
 * Convert polygons from a list of points to a string that SVG's <polygon>
 * element understands.
 */
function pointsToPolygonFormat(polygon: Point[]) {
  let pointStrings = polygon.map((point) => point[0]+","+point[1])
  return pointStrings.join(" ")
}

const layerN = ref(0)

</script>

<template>
  <div class="display2d">
    Layer: <input v-model="layerN" type="range" min="0" max="5" /> {{ layerN }}
    <svg
      :viewBox="viewBox"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        v-for="polygon in allPolygons"
        :points="pointsToPolygonFormat(polygon)"
        stroke="black"
        stroke-width="0.01"
        fill-opacity="0.25"
        @click="console.log('Clicked!' + polygon)"
      />
    </svg>
  </div>
</template>

<style scoped>
.display2d {
  width: 100%;
  height: 100%;
}
</style>