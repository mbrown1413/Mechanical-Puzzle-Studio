import {Piece, PieceCompleteId} from "~/lib/Piece.ts"
import {TaskCallbacks} from "~/lib/types.ts"
import {Grid, Transform} from "~/lib/Grid.ts"
import {getMovements, Movement} from "~/lib/movement.ts"
import {Disassembly, DisassemblyStep} from "~/lib/Disassembly.ts"
import {clone} from "~/lib/serialize.ts"

/**
 * The movement defined in the DisassemblyStep properties define how to
 * move the pieces to get from parent to child. This structure is stored in
 * the parent and provides indexes into `nodes` of the children.
 */
type Child = {
    movedPieces: PieceCompleteId[]
    transform: Transform
    repeat: number  // Number of times `transform` is repeated

    /**
     * The node indexes for the resulting sub-assemblies.
     *
     * There may be one or two parts in this array: one in the normal case and
     * two if the movement creates two sub-assemblies that are separate. A
     * value of -1 for a part means that the part doesn't need to be
     * disassembled any further, usually when it only consists of a single
     * piece.
     */
    parts: number[]
}

type Node = {
    depth: number
    children: Child[]
    solved?: boolean
}

type PlacementHash = string

type QueueItem = {
    node: Node,
    path: number[]
    placements: Piece[]
}

export abstract class Disassembler {
    grid: Grid
    start: Piece[]

    constructor(grid: Grid, start: Piece[]) {
        this.grid = grid
        this.start = start
    }

    abstract disassemble(
        callbacks: TaskCallbacks
    ): Disassembly[]
}

export class SimpleDisassembler extends Disassembler {
    nodes: Node[]
    nodeIndexesByHash: Map<PlacementHash, number>

    // Whether to explore all possible states or stop at the first solution
    // found.
    findAll: boolean

    constructor(grid: Grid, start: Piece[]) {
        super(grid, start)
        this.nodes = []
        this.nodeIndexesByHash = new Map()
        this.findAll = false
    }

    disassemble(): Disassembly[] {
        if(this.nodes.length || this.nodeIndexesByHash.size) {
            throw new Error("Disassemble instance cannot be reused")
        }

        const startNode: Node = {
            depth: 0,
            children: [],
        }
        this.nodes.push(startNode)
        this.nodeIndexesByHash.set(this.hashPlacements(this.start), 0)

        // Breadth-first search where each node is a sub-assembly of the whole.
        // Each node can have multiple children, but a single child can
        // actually be two nodes if the movement splits an assembly into two
        // parts.
        const queue: QueueItem[] = [{
            node: startNode,
            path: [0],
            placements: this.start
        }]
        while(queue.length > 0) {
            const current = queue.shift()
            if(!current) { break }

            let movements = getMovements(this.grid, current.placements)

            // If any move separates, only keep one. This works since
            // separating never hinders other moves from happening afterwards.
            // That is, separation will always increase the freedom of
            // movement. We prefer removing single pieces at a time to keep
            // disassemblies simple when possible.
            //
            // This is an optimization, but it also prevents us from getting
            // stuck in pathological loops where a piece is stationary off to
            // one side of the rest of the assembly, while the assembly walks
            // infinitely in one direction.
            let separatingMove = null
            for(const movement of movements) {
                if(!movement.separates) { continue }
                if(movement.movedPieces.length === 1) {
                    separatingMove = movement
                    break
                }
                separatingMove = movement
            }
            if(separatingMove) {
                movements = [separatingMove]
            }

            for(const movement of movements) {

                const childParts = this.getChildParts(movement)

                const childIndexes = []
                let childPointsToDeeperNode = false
                for(const childPart of childParts) {
                    const [
                        childNode,
                        childIndex,
                        isNew
                    ] = this.getOrCreateNode(childPart, current.node.depth + 1)

                    if(childNode !== null && childNode.depth > current.node.depth) {
                        childPointsToDeeperNode = true
                    }

                    childIndexes.push(childIndex)
                    if(isNew) {
                        queue.push({
                            node: this.nodes[childIndex],
                            path: [...current.path, childIndex],
                            placements: childPart,
                        })
                    }
                }

                // If more than one movement goes to the same sets of children,
                // there's no need to make a duplicate child pointer for it.
                const childIndexesShorthand = childIndexes.toSorted().join(",")
                if(current.node.children.find(
                    child => child.parts?.toSorted().join(",") === childIndexesShorthand
                )) {
                    continue
                }

                const isLeaf = childIndexes[0] === -1 && childIndexes[1] === -1
                if(!isLeaf && !childPointsToDeeperNode) {
                    continue
                }

                current.node.children.push({
                    movedPieces: movement.movedPieces,
                    transform: movement.transform,
                    repeat: movement.repeat,
                    parts: childIndexes,
                })

                if(isLeaf) {

                    // Walk up our ancestors and mark any solved which have a
                    // child with all its parts solved.
                    for(const nodeIndex of current.path.toReversed()) {
                        const node = this.nodes[nodeIndex]
                        const solvedChild = node.children.find(
                            child => child.parts.every(part => part === -1 || this.nodes[part].solved)
                        )
                        if(solvedChild) {
                            node.solved = true
                        } else {
                            break
                        }
                    }

                    if(!this.findAll && startNode.solved) {
                        const disassemblies = this.getAllAssembliesFromTree()
                        return [disassemblies[0]]
                    }
                }
            }
        }

        return this.getAllAssembliesFromTree()
    }

    private getOrCreateNode(
        placements: Piece[],
        depth: number
    ): [node: Node | null, nodeIndex: number, isNew: boolean] {
        if(placements.length <= 1) {
            // This is a leaf (completely separated piece on its own) so we
            // don't create an explicit node for it.
            return [null, -1, false]
        }

        // Try to find existing node
        const hash = this.hashPlacements(placements)
        let index = this.nodeIndexesByHash.get(hash)
        if(index !== undefined) {
            // Found existing node!
            return [this.nodes[index], index, false]
        }

        // Create a new node
        const newNode: Node = {
            depth,
            children: []
        }
        this.nodes.push(newNode)
        index = this.nodes.length - 1
        this.nodeIndexesByHash.set(hash, index)
        return [newNode, index, true]
    }

    /** Split the movement's resulting placements into two if it separates into
     * two parts. */
    private getChildParts(movement: Movement): Piece[][] {
        let childPlacements: Piece[][]
        if(movement.separates) {
            childPlacements = [[], []]
            for(const piece of movement.placements) {
                if(movement.movedPieces.includes(piece.completeId)) {
                    childPlacements[0].push(piece)
                } else {
                    childPlacements[1].push(piece)
                }
            }
        } else {
            childPlacements = [movement.placements]
        }
        return childPlacements
    }

    private hashPlacements(placements: Piece[]): PlacementHash {
        placements = placements.toSorted((a, b) => {
            if(a.completeId < b.completeId) {
                return -1
            } else if(a.completeId > b.completeId) {
                return 1
            } else {
                return 0
            }
        })
        const translation = this.grid.getOriginTranslation(placements[0].voxels)
        return JSON.stringify([
            placements.map(p => p.completeId),
            placements.map(p => this.grid.doTransform(translation, p.voxels))
        ])
    }

    /**
     * Read internal tree structure for all solutions.
     */
    private getAllAssembliesFromTree(): Disassembly[] {
        const solutions: Disassembly[] = []

        // Recursive breadth-first search. Each iteration we consider a set of
        // nodes, one for each part our starting assembly has split into. We
        // recursively call iterate for every possible set of child nodes.
        const iterate = (
            placements: Piece[],
            nodes: Node[],
            steps: DisassemblyStep[],
        ) => {
            const childIsSolved = (child: Child) => child.parts.every(
                partIdx => partIdx === -1 || this.nodes[partIdx].solved
            )

            // Every permutation of children whose parts are all marked solved.
            const childrenChoices = product(
                ...nodes.map(
                    node => node.children.filter(childIsSolved)
                )
            )

            for(const children of childrenChoices) {

                const newPlacements = placements.map(p => p.copy())
                const newNodes = []
                for(const child of children) {

                    // Make movements indicated in the children we chose
                    for(const piece of newPlacements) {
                        if(child.movedPieces.includes(piece.completeId)) {
                            for(let i=0; i<(child.repeat || 1); i++) {
                                piece.doTransform(this.grid, child.transform)
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
                newSteps.push(...children.map(child => {
                    return {
                        movedPieces: child.movedPieces,
                        transform: child.transform,
                        repeat: child.repeat,
                        separates: child.parts.length > 1,
                    }
                }))

                if(newNodes.length > 0) {
                    iterate(newPlacements, newNodes, newSteps)
                } else {
                    // If no nodes are left, all parts have reached leaf nodes and
                    // we have a complete solution.
                    solutions.push(new Disassembly(clone(newSteps)))
                }
            }
        }

        iterate(this.start, [this.nodes[0]], [])
        for(const solution of solutions) {
            solution.prepareForStorage(this.grid, this.start)
        }
        return solutions
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