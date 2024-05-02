import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {PieceWithId, PieceCompleteId} from "~/lib/Piece.ts"
import {Grid, Transform} from "~/lib//Grid.ts"

type DisassemblyStep = {
    movedPieces: PieceCompleteId[]
    transform: Transform

    /** How many times `transform` is repeated. Undefined means repeat=1 */
    repeat?: number
}

/**
 * The movement defined in the DisassemblyStep properties define how to
 * move the pieces to get from parent to child. This structure is stored in
 * the parent and provides indexes into `nodes` of the children.
 */
type DisassemblyChild = DisassemblyStep & {
    /**
     * The node indexes for the resulting sub-assemblies.
     *
     * There may be one or two parts in this array: one in the normal case and
     * two if the movement creates two sub-assemblies that are separate. A
     * value of -1 for a part means that the part doesn't need to be
     * disassembled any further, usually when it only consists of a single
     * piece. If `parts` is undefined, it implies [-1, -1].
     */
    parts?: number[]
}

export type DisassemblyNode = {
    depth: number
    children: DisassemblyChild[]
}

/**
 * Stores many disassemblies more efficiently than a simple list of
 * disassemblies by using a tree structure.
 */
export class DisassemblySet extends SerializableClass {

    /**
     * Flat list of nodes in a tree structure. The first node in the list is
     * the start state.
     */
    nodes: DisassemblyNode[]

    constructor(nodes: DisassemblyNode[]) {
        super()
        this.nodes = nodes
    }

    simplify() {
        for(const node of this.nodes) {
            for(const childEdge of node.children) {

                // Remove optional properties
                if(childEdge.repeat === 1) {
                    delete childEdge["repeat"]
                }
                if(
                    childEdge.parts &&
                    childEdge.parts.length === 2 &&
                    childEdge.parts[0] === -1 &&
                    childEdge.parts[1] === -1
                ) {
                    delete childEdge["parts"]
                }

            }
        }
    }

    /**
     * Return a flat list of disassemblies from this disassembly set.
     */
    getDisassemblies(grid: Grid, start: PieceWithId[]): Disassembly[] {
        const solutions: Disassembly[] = []

        // Recursive breadth-first search. Each iteration we consider a set of
        // nodes, one for each part our starting assembly has split into. We
        // recursively call iterate for every possible set of child nodes.
        const iterate = (
            placements: PieceWithId[],
            nodes: DisassemblyNode[],
            steps: DisassemblyStep[],
        ) => {
            const childrenChoices = product(...nodes.map(node => node.children))
            for(const children of childrenChoices) {

                const newPlacements = placements.map(p => p.copy())
                const newNodes = []
                for(const child of children) {

                    // Make movements indicated in the children we chose
                    for(const piece of newPlacements) {
                        if(child.movedPieces.includes(piece.completeId)) {
                            for(let i=0; i<(child.repeat || 1); i++) {
                                piece.transform(grid, child.transform)
                            }
                        }
                    }

                    // Add child nodes, ignoring leaf nodes of -1
                    for(const nodeIdx of child.parts || []) {
                        if(nodeIdx === -1) { continue }
                        newNodes.push(this.nodes[nodeIdx])
                    }
                }

                const newSteps = [...steps]
                newSteps.push(...children)

                if(newNodes.length > 0) {
                    iterate(newPlacements, newNodes, newSteps)
                } else {
                    // If no nodes are left, all parts have reached leaf nodes and
                    // we have a complete solution.
                    solutions.push(new Disassembly(grid, start, newSteps))
                }
            }
        }

        iterate(start, [this.nodes[0]], [])
        return solutions
    }
}
registerClass(DisassemblySet)

/**
 * A single way to completely disassemble a set of pieces.
 */
export class Disassembly {
    grid: Grid
    start: PieceWithId[]
    steps: DisassemblyStep[]

    constructor(grid: Grid, start: PieceWithId[], steps: DisassemblyStep[]) {
        this.grid = grid
        this.start = start
        this.steps = steps
    }

    get nStates() {
        return this.steps.length + 1
    }

    /**
     * Get each intermediate placement of pieces between the start and
     * disassembly.
     */
    getState(stateNumber: number): PieceWithId[] {
        const state = this.start.map(piece => piece.copy())
        for(const step of this.steps.slice(0, stateNumber)) {
            for(const piece of state) {
                if(step.movedPieces.includes(piece.completeId)) {
                    for(let i=0; i<(step.repeat || 1); i++) {
                        piece.transform(this.grid, step.transform)
                    }
                }
            }
        }
        return state
    }
}

/**
 * Cartesian product of the given iterables.
 */
function *product<T>(...iterables: T[][]): Iterable<T[]> {
    const indexes = iterables.map(iterable => iterable.length - 1)

    // If any parameters are empty, the whole product will be empty too.
    if(indexes.some(index => index < 0)) {
        return
    }

    while(indexes[0] >= 0) {
        yield iterables.map(
            (iterable, i) => iterable[indexes[i]]
        )

        // Decrement last of indexes. If it reaches -1, roll over to the next
        // to last, and so on.
        for(let i=iterables.length-1; i>=0; i--) {
            if(--indexes[i] < 0) {
                if(i === 0) { return }
                indexes[i] = iterables[i].length - 1
            } else {
                break
            }
        }
    }
}