<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { Vector2, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
THREE.CurvePath
import { Grid } from "../grid.ts"
import { Piece } from  "../puzzle.ts"

const props = defineProps<{
    grid: Grid,
    piece: Piece,
}>()

const el = ref()

const renderer = new THREE.WebGLRenderer({antialias: true})
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 5);
camera.position.set(-2, -2, 2)
//const camera = new THREE.OrthographicCamera(-5.5, 5.5, -5.5, 5.5);

let controls = new OrbitControls(camera, renderer.domElement)
controls.listenToKeyEvents(window)
controls.addEventListener('change', refresh)

const light = new THREE.DirectionalLight(0xffffff, 3)
light.position.set(-5, -5, -5)
light.lookAt(new Vector3(0, 0, 0))
scene.add(light)

const material = new THREE.MeshPhongMaterial({color: 0xffffff, emissive: 0x444444, side: THREE.DoubleSide});

function getPlaneNormal(points: Vector3[]) {
    // Find plane normal using a cross product between the first 3 points.
    //TODO: Of course, the 3 points could be co-linear, which would break this.
    //    We should really check a bunch of tripplets until we get a strong enough
    //    magnitude normal.
    const v1 = points[0].clone().sub(points[1])
    const v2 = points[1].clone().sub(points[2])
    return new Vector3().crossVectors(v1, v2)
}

function checkCoplanar(points: Vector3[], normal: Vector3|null=null) {
    if(points.length <= 3) return true
    if(normal === null) {
        normal = getPlaneNormal(points)
    }

    // Take all the vectors between each point and point 0. Their dot product
    // with the normal should be zero if coplanar.
    for(let i=3; i<points.length; i++) {
        const dot = points[i].clone().sub(points[0]).dot(normal)
        if(Math.abs(dot) > 0.001) {
            return false
        }
    }
    return true
}

/**
 * Construct a mesh of the polygon formed by the given points.
 * 
 * The vectors must be coplanar.
 */
function getPolygonMesh(polygon: Vector3[], material: THREE.Material) {
    if(polygon.length < 3) {
        throw "Polygon must have at least 3 points: " + polygon
    }
    
    // How this function works: We can't draw an arbitrary polygon directly in
    // 3-space without decomposing it into triangles, which is not a simple
    // thing to do. threejs does however have a tool called Shape/ShapeGeometry
    // which allows us to draw a 2d shape on the XY plane, which we can then
    // rotate and translate how we please.
    //
    // We'll construct a new coordinate system based on the plane of the
    // polygons, then project the polygon onto it. Then we can use
    // ShapeGeometry to draw on the flat XY plane and then rotate and translate
    // it to be on our new coordinate system.
    
    // Note: If you're not familiar with linear algebra, a basis for us is just
    // 3 unit-vectors (xBasis, yBasis, zBasis) that are like the X, Y and Z
    // axes, but for our new coordinate system. (in general they don't have to
    // be orthogonal, but we have some freedom in constructing them here, so we
    // make them orthogonal to make things simple).

    // 1) Construct a new coordinate system
    // Choose an arbitrary point as the origin and construct x, y, z basis
    // vectors for the plane all of the points are on. The Z basis is really
    // just a normal vector to the plane.
    //
    // Technically we shouldn't arbitrarily set of points for computing the
    // normal and the xBasis, since this calculation would break if they are
    // colinear (and there's probably high numerical error if they are close to
    // colinear). Hopefully for now we can assume that polygons returned from
    // grids are well behaved though.
    const origin = polygon[0]
    const zBasis = getPlaneNormal(polygon)
    const xBasis = polygon[1].clone().sub(origin).normalize()
    const yBasis = new Vector3().crossVectors(zBasis, xBasis).normalize()
    if(!checkCoplanar(polygon, zBasis)) {
        throw "Polygon points must be coplanar: " + polygon
    }

    // 2) Project polygon onte the new coordinate system
    // Convert all 3d points into 2d by projecting onto the plane.
    // We project here by shifting the point to our new coordinate system's
    // origin then taking the dot product with the x and y bases.
    //
    // The whole point of this is to accurately represent our polygon without a
    // Z coordinate. This is possible to do because zBasis is normal to our
    // polygon's plane, and all of the polygon points are on the plane. So if
    // we were to include Z here, it would just be zero.
    const projectedPolygon = polygon.map((point) => new Vector2(
        point.clone().sub(origin).dot(xBasis),
        point.clone().sub(origin).dot(yBasis),
    ))

    // 3) Construct mesh
    // threejs draws this on the XY plane.
    const shape = new THREE.Shape(projectedPolygon)
    const geometry = new THREE.ShapeGeometry(shape)
    const mesh = new THREE.Mesh(geometry, material)

    // 4) Rotate to our new coordinate system The matrix to rotate the old to
    // new coordinate system is just a matrix made up of the 3 basis vectors.
    // Simple!
    //
    // Okay, if you're good at linear algebra, that might actually be obvious,
    // but it wasn't obvious to me, so I'm going to give some details. In
    // general, you can change from a basis C to basis B by expressing B basis
    // vectors in terms of B, then constructing a matrix based on those.
    //
    //   https://www.statlect.com/matrix-algebra/change-of-basis
    //   https://en.wikipedia.org/wiki/Change_of_basis
    //
    // Our old basis is the world coordinate space W and our new one we'll call
    // B. The basis for W is easy, it's just the 3 unit-vectors along the 3
    // axes. Because of this, expressing B in terms of W is easy, it's just our
    // 3 basis vectors.
    const basis = new THREE.Matrix4().makeBasis(xBasis, yBasis, zBasis)
    mesh.rotation.setFromRotationMatrix(basis)

    // 5) Translate to the new coordinate system
    // Due to how threejs applies rotations and translations, the order doesn't
    // matter; we could set the position before or after the rotation and the
    // translation would still be applied in our old coordinate system how we
    // want.
    mesh.position.set(origin.x, origin.y, origin.z)

    return mesh
}

for(let coordinate of props.piece.coordinates) {
    const cellInfo = props.grid.getCellInfo(coordinate)
    for(let polygon of Object.values(cellInfo.sidePolygons)) {
        const mesh = getPolygonMesh(polygon, material)
        scene.add(mesh)
    }
}

function refresh() {
    if(el.value === null) return
    const width = el.value.offsetWidth
    const height = el.value.offsetHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.render(scene, camera)
}

onMounted(() => {
    const resizeObserver = new ResizeObserver(refresh)
    resizeObserver.observe(el.value)

    el.value.appendChild(renderer.domElement);
    refresh();
})

</script>

<template>
    <div class="display2d" ref="el"></div>
</template>

<style scoped>
.display2d {
    width: 100%;
    height: 100%;
}
</style>
