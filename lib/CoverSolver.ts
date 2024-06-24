/**
 * Solver for the exact-cover problem.
 *
 * The exact-cover problem is given by a matrix of 1s and 0s. The goal is to
 * find a set of rows in which every column contains exactly one 1 value. Many
 * other problems can be reduced to an exact-cover problem, including puzzle
 * assembling!
 *
 * This solver uses the obvious backtracking algorithm called Algorithm X,
 * implemented using a fast and clever data structure called Dancing Links.
 * Together this is called Dancing-Links-Algorithm-X or DLX. For a good
 * introduction to DLX, read Donald Knuth's paper which popularized it:
 *
 *     Dancing Links
 *     http://arxiv.org/pdf/cs/0011047
 *
 * In these comments we'll expect you to understand DLX well, and only explain
 * deviations and additions to it.
 *
 *
 * Column Min / Max
 * ================
 *
 * The typical addition to DLX is to allow for optional columns, which may have
 * a 1 present in the solution, but need not have one. This is implemented by
 * removing that column from the header. The search routine won't find it when
 * it's looking for columns to choose next, but otherwise the data is there and
 * connected to other nodes as usual.
 *
 * We go a step further and allow a column to have a minimum and maximum. That
 * is, a column may have anywhere from `col.min` to `col.max` 1's in the
 * solution. When covering a column, we decrement both min and max. If min
 * reaches 0, the column is removed from the header just like a normal optional
 * column. If max is greater than 0, we don't actually continue covering the
 * column by removing rows from the matrix, since those rows could still be
 * used. The uncover operation similarly undoes those steps.
 *
 * Column min/max can be set with the `setColumnRange()` method.
 *
 *
 * Removing Duplicate Solutions
 * ============================
 *
 * Allowing columns to be used more than once presents a problem: we can end up
 * with duplicate solutions. This happens if the same column with max > 1 is
 * chosen twice. The same two rows can be chosen each time, just in a different
 * order.
 *
 * The fix is to limit ourselves to considering rows only below any already chosen
 * rows in that column. The second time we choose a column, we iterate over
 * rows starting just after the last row chosen in that column.
 *
 *
 * Filling optional columns after a solution is found
 * ==================================================
 *
 * What happens when we've found a solution, but more optional columns could
 * still be filled? Do we keep searching for more solutions or stop? Which way
 * we resolve this ambiguity has implications for the solutions that are
 * returned for the assembler. It also has performance implications.
 *
 * For now, we don't continue searching for solutions. This keeps the
 * implementation fast and simple. Even though we may technically miss some
 * solutions, every solver will have its quirks, and we can always change this
 * later.
 */

/**
 * Each row in a solution represents a row chosen, and each item in the the row
 * is a column's data given in the CoverSolver cosntructor. For example, if we
 * have a cover problem with column data "A", "B", and "C", a solution might
 * be:
 *
 *     [["A", "B"], ["C"]]
 *
 * This indicates that two rows were present in the solution. One with "A" and
 * "B", and the other row with "C".
 */
export type CoverSolution<Data> = Data[][]

type MainHeader = {
    l: ColumnHeader
    r: ColumnHeader
}

type ColumnHeader = {
    index: number
    count: number
    l: ColumnHeader | MainHeader
    r: ColumnHeader | MainHeader
    u: ColumnHeader | Node
    d: ColumnHeader | Node

    // The maximum / minimum number of rows with a 1 which may appear in this
    // column for a valid solution.
    min: number
    max: number

    // For columns with max > 1, this stack saves the position of the column.d
    // pointer so it can be restored later.
    nextRowStack: (Node | ColumnHeader)[]
}

type Node = {
    l: Node
    r: Node
    u: Node | ColumnHeader
    d: Node | ColumnHeader
    c: ColumnHeader
}

function positiveMod(x: number, divisor: number) {
    return (x + divisor) % divisor
}

export class CoverSolver<Data> {
    columnData: Data[]
    nCols: number

    private header: MainHeader
    private allCols: ColumnHeader[]  // Includes columns removed from the header

    // Each item is one node from a row picked in the solution so far
    private partialSolution: Node[]

    /**
     * `columnData` is an array containing information about each column. The
     * solutions will reference this data to indicate which column each row of
     * the solution has.
     *
     * `nOptionalColumn` indicates the number of columns which are not required
     * to have a 1 in a solution. These columns are always assumed to be at the
     * end, so you must order `columnData` accordingly. Alternatively, you can
     * set individual columns as optional using `setColumnOptional()`.
     */
    constructor(columnData: Data[], nOptionalColumns=0) {
        this.columnData = columnData
        this.nCols = columnData.length

        const headerInfo = this.createHeader()
        this.header = headerInfo.mainHeader
        this.allCols = headerInfo.allCols

        for(let i=this.nCols - nOptionalColumns; i<this.nCols; i++) {
            this.setColumnOptional(i)
        }

        this.partialSolution = []
    }

    private toMatrix(): number[][] {
        const matrix: number[][] = []
        const processedNodes: Set<Node> = new Set()

        const makeRow = (startNode: Node) => {
            const row: number[] = new Array(this.nCols).fill(0)

            row[startNode.c.index] = startNode.u.d === startNode ? 1 : 2
            processedNodes.add(startNode)

            // Walk nodes in row, marking each column a node is in with a 1
            for(
                let node = startNode.r;
                node != startNode;
                node = node.r
            ) {
                row[node.c.index] = node.u.d === node ? 1 : 2
                processedNodes.add(node)
            }

            matrix.push(row)
        }

        for(const col of this.allCols) {

            // For each node representing a 1 in that column
            for(
                let node = col.d;
                node !== col;
                node = node.d
            ) {
                node = node as Node

                // Make a row out of this node, but only if we haven't
                // processed the row this node is in yet.
                if(!processedNodes.has(node)) {
                    makeRow(node)
                }
            }

        }
        return matrix
    }

    /**
     * Return a string representation of the currently represented problem
     * matrix. A header is printed with the column data if it is a string,
     * otherwise column indexes are used. An "x" on a column or cell represents
     * a node which is not required. 0s are represented with "." for better
     * readability.
     */
    toString(): string {
        const matrix = this.toMatrix()
        const result = []

        const nColChars: number[] = []
        const headStrs = []
        for(const [colNum, col] of this.allCols.entries()) {
            const colData = this.columnData[colNum]

            let colLabel = typeof colData === "string" ? colData : String(colNum)
            if(col.min === 0 && col.max === 1) {
                colLabel += "?"
            } else if(col.max <= 0) {
                colLabel += " x"
            } else if(col.min != 1 || col.max != 1) {
                colLabel += ` ${col.min}-${col.max}`
            }

            nColChars.push(colLabel.length)
            headStrs.push(colLabel)
        }
        result.push(headStrs.join(" "))

        // Underline between header and rows
        result.push(nColChars.map(
            nChars => "-".repeat(nChars)
        ).join(" "))

        for(const row of matrix) {
            const cellStrs = []

            for(const [colNum, cell] of row.entries()) {
                let cellStr: string
                if(cell === 0) {
                    cellStr = "."
                } else if(cell === 1) {
                    cellStr = "1"
                } else {
                    cellStr = "x"
                }
                const leftPad = Math.floor((nColChars[colNum] - cellStr.length) / 2)
                const rightPad = nColChars[colNum] - cellStr.length - leftPad
                cellStrs.push(
                    " ".repeat(leftPad) + cellStr + " ".repeat(rightPad))
            }

            result.push(cellStrs.join(" ").trimEnd())
        }
        return result.join("\n")
    }

    private createHeader() {
        // Please excuse the odd temporary assignments used to make circular
        // references during initializations and make typescript happy.
        const mainHeader: MainHeader = {
            l: {} as ColumnHeader,
            r: {} as ColumnHeader,
        }
        const allCols = []

        const header: (MainHeader | ColumnHeader)[] = [mainHeader]
        for(let i=0; i<this.nCols; i++) {
            const node: ColumnHeader = {
                index: i,
                count: 0,
                l: {} as ColumnHeader,
                r: {} as ColumnHeader,
                u: {} as ColumnHeader,
                d: {} as ColumnHeader,
                min: 1,
                max: 1,
                nextRowStack: [],
            }
            node.u = node
            node.d = node
            header.push(node)
            allCols.push(node)
        }

        // Link header nodes together
        for(const [i, node] of header.entries()) {
            node.l = header[positiveMod(i-1, this.nCols+1)]
            node.r = header[positiveMod(i+1, this.nCols+1)]
        }

        return {
            mainHeader,
            allCols: allCols,
        }
    }

    /** Shortcut for setting range 0-1. */
    setColumnOptional(columnIndex: number) {
        this.setColumnRange(columnIndex, 0, 1)
    }

    setColumnRange(columnIndex: number, min: number, max: number) {
        const col = this.allCols[columnIndex]

        if(col.min <= 0 && min > 0) {
            // Add column back to header
            col.l = this.header.r
            col.r = this.header
            this.header.l.r = col
            this.header.l = col
        } else if(col.min > 0 && min <= 0) {
            // Remove column from header
            col.l.r = col.r
            col.r.l = col.l
            col.l = col
            col.r = col
        }

        col.min = min
        col.max = max
    }

    /**
     * Add a row to the problem matrix.
     */
    addRow(row: (boolean | number)[]) {
        if(row.length !== this.nCols) {
            throw new Error(`Expected ${this.nCols} columns, added row has ${row.length}`)
        }

        // Create nodes for each truthy value, and link them up and down.
        const newNodes = []
        for(let i=0; i<row.length; i++) {
            if(!row[i]) { continue }
            const columnHeader = this.allCols[i]

            const newNode: Node = {
                u: columnHeader.u,
                d: columnHeader,
                l: {} as Node,
                r: {} as Node,
                c: columnHeader,
            }
            newNodes.push(newNode)

            columnHeader.count += 1
            columnHeader.u.d = newNode
            columnHeader.u = newNode
        }

        // Link row nodes left-to-right
        for(const [i, newNode] of newNodes.entries()) {
            newNode.l = newNodes[positiveMod(i-1, newNodes.length)]
            newNode.r = newNodes[positiveMod(i+1, newNodes.length)]
        }
    }

    /**
     * Find all solutions.
     */
    solve(): CoverSolution<Data>[] {
        const solutions: CoverSolution<Data>[] = []
        this.search(solutions)
        return solutions
    }

    private search(solutions: CoverSolution<Data>[], depth=0) {
        const {column, solutionFound} = this.chooseColumn()
        if(solutionFound) {
            solutions.push(this.getPartialSolution(depth))
        }
        if(!column) { return }

        this.coverColumn(column)

        // For each "1" in this column
        for(
            let row = column.d;
            row !== column;
            row = row.d
        ) {
            row = row as Node

            // Set this row as part of the solution
            this.partialSolution[depth] = row

            if(column.max > 0) {
                // Save the current next row so it can be restored later
                column.nextRowStack.push(column.d as Node)
                // Limit the rows we consider next time this column is picked
                // to rows after one we just picked.
                column.d = row.d
            }

            // Cover each column in which this row has a 1
            for(
                let node = row.r;
                node !== row;
                node = node.r
            ) {
                this.coverColumn(node.c)
            }

            // We've modified the matrix for our partial solution. Now recurse!
            this.search(solutions, depth + 1)

            // Uncover columns covered above
            for(
                let node = row.l;
                node !== row;
                node = node.l
            ) {
                this.uncoverColumn(node.c)
            }

            if(column.max > 0) {
                column.d = column.nextRowStack.pop() as Node | ColumnHeader
            }
        }

        this.uncoverColumn(column)
    }

    /**
     * Convert `this.partialSolution` (column indexes) into a `CoverSolution`
     * using `this.columnData`.
     */
    private getPartialSolution(depth: number): CoverSolution<Data> {
        const solution = []
        for(const row of this.partialSolution.slice(0, depth)) {
            const rowOut = [this.columnData[row.c.index]]
            for(
                let node = row.r;
                node !== row;
                node = node.r
            ) {
                node = node as Node
                rowOut.push(this.columnData[node.c.index])
            }
            solution.push(rowOut)
        }
        return solution
    }

    /** Return the best column to iterate over next, or null if no more
     * columns are necessary, and therefore we've found a solution. Also checks
     * if the current state is a valid solution. */
    private chooseColumn(): {
        column: ColumnHeader | null,
        solutionFound: boolean,
     } {
        let chosenCol: ColumnHeader | null = null
        let hasRequiredCols = false

        for(
            let col: ColumnHeader | MainHeader = this.header.r;
            col !== this.header;
            col = col.r as ColumnHeader
        ) {
            if(col.min > 0) {
                hasRequiredCols = true
            }
            if(chosenCol === null || (col.min > 0 && col.count < chosenCol.count)) {
                chosenCol = col
            }
        }

        return {
            column: chosenCol,
            solutionFound: !hasRequiredCols,
        }
    }

    private coverColumn(column: ColumnHeader) {
        column.min -= 1
        column.max -= 1

        if(column.min <= 0) {
            // Remove column from header if we don't want it to be chosen
            column.r.l = column.l
            column.l.r = column.r
        }

        if(column.max > 0) {
            // Don't actually cover if we can use this column more times.
            return
        }

        // For each 1 in the column
        for(
            let row = column.d;
            row !== column;
            row = row.d
        ) {
            row = row as Node

            // Remove the row
            for(
                let node = row.r;
                node !== row;
                node = node.r
            ) {
                node.d.u = node.u
                node.u.d = node.d
                node.c.count -= 1
            }

        }
    }

    private uncoverColumn(column: ColumnHeader) {
        column.min += 1
        column.max += 1

        if(column.min > 0) {
            // Restore column header
            column.r.l = column
            column.l.r = column
        }

        if(column.max <= 0) {
            // Don't uncover until we can actually use this column
            return
        }

        // For each 1 in the column
        for(
            let row = column.u;
            row !== column;
            row = row.u
        ) {
            row = row as Node

            // Restore the row
            for(
                let node = row.l;
                node !== row;
                node = node.l
            ) {
                node.c.count += 1
                node.d.u = node
                node.u.d = node
            }
        }
    }
}