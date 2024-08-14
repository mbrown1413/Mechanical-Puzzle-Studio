import * as THREE from "three"

/**
 * A custom version of THREE.AxisHelper to show colored lines for the axes.
 * 
 * Additional features supported:
 *   * Thick lines drawn using cylinders instead of gl.LINES
 *   * Different lengths for each axis line
 */
export function makeAxesHelper(
    xSize: number = 1,
    ySize: number = 1,
    zSize: number = 1
): THREE.Object3D {
    const thickness = 0.008
    const divisions = 4
    const lines = [
        [[0, 0, 0], [xSize, 0, 0]],
        [[0, 0, 0], [0, ySize, 0]],
        [[0, 0, 0], [0, 0, zSize]],
    ]

    const material = new THREE.MeshBasicMaterial()

    const lineMesh = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(
            thickness,
            thickness,
            1,
            divisions,
            1
        ),
        material,
        lines.length
    )

    let i = 0
    for(const [point1, point2] of lines) {
        lineMesh.setMatrixAt(
            i++,
            makeCylinderTransform(
                new THREE.Vector3(...point1),
                new THREE.Vector3(...point2),
            )
        )
    }
    lineMesh.setColorAt(0, new THREE.Color("#ff0000"))
    lineMesh.setColorAt(1, new THREE.Color("#00ff00"))
    lineMesh.setColorAt(2, new THREE.Color("#0000ff"))

    return lineMesh
}

/** Returns a transform to place a cylinder to be placed starting at point1
 * and ending at point2. */
export function makeCylinderTransform(
    point1: THREE.Vector3,
    point2: THREE.Vector3
): THREE.Matrix4 {
    const unitDirection = new THREE.Vector3().subVectors(point2, point1)
    const length = unitDirection.length()
    unitDirection.normalize()

    // The CylinderGeometry starts 1 unit long, centered at (0, 0, 0), with
    // its long axis pointing along the Y axis. Here we translate so it
    // goes from (0, 0, 0) to (0, 1, 0).
    const m = new THREE.Matrix4().makeTranslation(0, 0.5, 0)

    // Stretch so it's the same length as our target line
    m.premultiply(new THREE.Matrix4().makeScale(1, length, 1))

    // Rotate to point in the same direction as our target line
    const up = new THREE.Vector3(0, 1, 0)
    const q = new THREE.Quaternion().setFromUnitVectors(up, unitDirection)
    const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(q)
    m.premultiply(rotationMatrix)

    // Move from starting at (0, 0, 0) to our target start, point1.
    m.premultiply(new THREE.Matrix4().makeTranslation(point1))

    return m
}

/**
 * Given 4 coplanar points in a clockwise order, return a geometry which is a
 * rectangle with those points as its corners.
 */
export function makeRectGeometry(
    point1: THREE.Vector3,
    point2: THREE.Vector3,
    point3: THREE.Vector3,
    point4: THREE.Vector3
): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    const vertices = new Float32Array([
        ...point1.toArray(),
        ...point2.toArray(),
        ...point3.toArray(),
        ...point4.toArray(),
    ])
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3))

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ])
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))

    const uv = new Float32Array([
        0, 1,
        1, 0,
        1, 1,
        0, 1,
    ])
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2))

    geometry.computeVertexNormals()
    return geometry
}