import { Point2d, Point3d, Vector } from "./types.js";

/**
* Convert from the coordinate system we use to SVG's coordinate space.
*
* In particular, the origin is changed from bottom-left to upper-left.
*/
export function pointsToSvgSpace(points: Point2d[]): Point2d[] {
  return points.map(([x,y]) => [x,-y]);
}

/**
 * Convert polygons from a list of points to a string that SVG's <polygon>
 * element understands.
 */
export function pointsToSvgPolygonFormat(points: Point2d[]): string {
  let pointStrings = points.map((point) => point[0]+","+point[1])
  return pointStrings.join(" ")
}

export function cross(a: Vector, b: Vector): Vector {
  return [
    a[1]*b[2] + a[2]*b[1],
    a[2]*b[0] + a[0]*b[2],
    a[0]*b[1] + a[1]*b[0],
  ]
}

export function magnitude(vector: Vector): number {
  return Math.sqrt(vector[0]**2 + vector[1]**2 + vector[2]**2)
}

export function normalize(vector: Vector): Vector {
  let mag = magnitude(vector)
  return [
    vector[0] / mag,
    vector[1] / mag,
    vector[2] / mag,
  ]
}

export function dot(a: Vector, b: Vector): number {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
}

function projectPointToPlane(
  forwardVector: Vector,
  xVector: Vector,
  point: Point3d
): Point2d {

  // Get unit vectors in the X and Y directions of the resulting plane we're
  // projecting onto.
  forwardVector = normalize(forwardVector)
  xVector = normalize(xVector)
  let yVector = cross(forwardVector, xVector)

  // Project each point onto the X and Y unit vectors separately to get the
  // final projected point.
  return [
    dot(point, xVector),
    dot(point, yVector),
  ]
}

/**
 * Project points in 3d space onto a 2d plane.
 *
 * @param forwardVector Normal vector to the plane being projected onto.
 * @param xVector Vector which will end up being the X direction in the
 *     resulting projected plane's X/Y space.
 * @param points Points to project.
 * @returns Given points projected onto the 2d plane.
 */
export function projectPointsToPlane(
  forwardVector: Vector,
  xVector: Vector,
  ...points: Point3d[]
): Point2d[] {
  return points.map((point) => projectPointToPlane(forwardVector, xVector, point))
}

