import {Coordinate} from "./types"

export function makeUniqueId() {
    return "id_" + Math.random().toString(16).slice(2)
}

export function arraysEqual(a: any[], b: any[]) {
    if(a.length !== b.length) return false
    return a.every((item, i) => item === b[i])
}

export function arrayContainsCoordinate(haystack: Coordinate[], needle: Coordinate) {
    return haystack.find(
        (c) => arraysEqual(c, needle)
    ) !== undefined
}
