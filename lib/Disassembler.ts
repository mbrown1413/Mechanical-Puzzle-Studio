import {PieceWithId} from "~/lib/Piece.ts"
import {TaskCallbacks} from "~/lib/types.ts"
import {DisassemblySet, DisassemblyNode} from "~/lib/DisassemblySet.ts"
import {Grid, Voxel} from "~/lib/Grid.ts"
import {getMovements, Movement} from "~/lib/movement.ts"

type PlacementHash = string

export abstract class Disassembler {
    grid: Grid

    constructor(grid: Grid) {
        this.grid = grid
    }

    abstract disassemble(
        pieces: PieceWithId[],
        callbacks: TaskCallbacks
    ): DisassemblySet
}

export class SimpleDisassembler extends Disassembler {
    origin: Voxel
    nodes: DisassemblyNode[]
    nodeIndexesByHash: Map<PlacementHash, number>

    constructor(grid: Grid) {
        super(grid)
        this.origin = grid.getVoxels(grid.getDefaultPieceBounds())[0]
        this.nodes = []
        this.nodeIndexesByHash = new Map()
    }

    disassemble(
        pieces: PieceWithId[],
    ): DisassemblySet {
        if(this.nodes.length || this.nodeIndexesByHash.size) {
            throw new Error("Disassemble instance cannot be reused")
        }

        const startNode: DisassemblyNode = {
            depth: 0,
            children: [],
        }
        this.nodes.push(startNode)
        this.nodeIndexesByHash.set(this.hashPlacements(pieces), 0)

        type QueueItem = {
            node: DisassemblyNode,
            placements: PieceWithId[]
            prevMovement?: Movement,
        }

        // Breadth-first search where each node is a sub-assembly of the whole.
        // Each node can have multiple children, but a single child can
        // actually be two nodes if the movement splits an assembly into two
        // parts.
        const queue: QueueItem[] = [{
            node: startNode,
            placements: pieces
        }]
        while(queue.length > 0) {
            const current = queue.shift()
            if(!current) { break }

            let movements = getMovements(this.grid, current.placements)

            // If any move separates, only keep the first one. This works since
            // separating never hinders other moves from happening afterwards.
            // That is, separation will always increase the freedom of
            // movement.
            //
            // This is an optimization, but it also prevents us from getting
            // stuck in pathological loops where a piece is stationary off to
            // one side of the rest of the assembly, while the assembly walks
            // infinitely in one direction.
            const separatingMove = movements.find(movement => movement.separates)
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
                            placements: childPart,
                            prevMovement: movement,
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
            }
        }

        const disassemblies = new DisassemblySet(this.nodes)
        disassemblies.simplify()
        return disassemblies
    }

    private getOrCreateNode(
        placements: PieceWithId[],
        depth: number
    ): [node: DisassemblyNode | null, nodeIndex: number, isNew: boolean] {
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
        const newNode: DisassemblyNode = {
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
    private getChildParts(movement: Movement): PieceWithId[][] {
        let childPlacements: PieceWithId[][]
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

    private hashPlacements(placements: PieceWithId[]): PlacementHash {
        placements = placements.toSorted((a, b) => {
            if(a.completeId < b.completeId) {
                return -1
            } else if(a.completeId > b.completeId) {
                return 1
            } else {
                return 0
            }
        })
        const translation = this.grid.getTranslation(placements[0].voxels[0], this.origin)
        return JSON.stringify([
            placements.map(p => p.completeId),
            placements.map(p => this.grid.doTransform(translation, p.voxels))
        ])
    }
}
