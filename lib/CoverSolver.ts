
// Each row represents a row chosen in the solution, which itself is a list of
// column data from each column in that row. For example, if we have a cover
// problem with column data "A", "B", and "C", a solution might be:
//
//     [["A", "B"], ["C"]]
//
// This indicates that two rows were present in the solution. One with "A" and
// "B", and the other row with "C".
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

/**
 * Solves the exact-cover problem.
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
 */
export class CoverSolver<Data> {
    columnData: Data[]

    nCols: number
    nOptionalCols: number
    nRequiredCols: number

    private header: MainHeader
    private allCols: ColumnHeader[]  // Includes optional columns

    // Each item is one node from a row picked in the solution so far
    private partialSolution: Node[]

    /**
     * `columnData` is an array containing information about each column. The
     * solutions will reference this data to indicate which column each row of
     * the solution has.
     *
     * `nOptionalColumn` indicates the number of columns which are not required
     * to have a 1 in a solution. These columns are always assumed to be at the
     * end, so you must order `columnData` accordingly.
     */
    constructor(columnData: Data[], nOptionalColumns=0) {
        this.columnData = columnData
        this.nCols = columnData.length
        this.nOptionalCols = nOptionalColumns
        this.nRequiredCols = this.nCols - this.nOptionalCols

        const headerInfo = this.createHeader()
        this.header = headerInfo.mainHeader
        this.allCols = headerInfo.allCols

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
     * a node which has been covered. 0s are represented with "." for better
     * readability.
     */
    toString(): string {
        const matrix = this.toMatrix()
        const result = []

        const nColChars: number[] = []
        const headStrs = []
        for(const [colNum, colData] of this.columnData.entries()) {
            let colLabel = typeof colData === "string" ? colData : String(colNum)
            if(colNum >= this.nRequiredCols) {
                colLabel += "?"
            }
            if(this.allCols[colNum].l.r !== this.allCols[colNum]) {
                colLabel += "x"
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
                cellStr += " ".repeat(nColChars[colNum] - cellStr.length)
                cellStrs.push(cellStr)
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
            }
            node.u = node
            node.d = node
            header.push(node)
            allCols.push(node)
        }

        // Link header nodes together
        for(const [i, node] of header.entries()) {
            if(i <= this.nCols - this.nOptionalCols) {
                // Optional columns are just linked to themselves. This makes
                // optional columns not picked up when the search method looks
                // for columns which need to be covered, although 
                node.l = header[positiveMod(i-1, this.nRequiredCols+1)]
                node.r = header[positiveMod(i+1, this.nRequiredCols+1)]
            } else {
                node.l = node
                node.r = node
            }
        }

        return {
            mainHeader,
            allCols: allCols,
        }
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
        if(this.header.r === this.header) {
            solutions.push(this.getPartialSolution())
            return
        }
        this.partialSolution.length = depth + 1

        const column = this.chooseColumn()
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
        }

        this.uncoverColumn(column)
    }

    /**
     * Convert `this.partialSolution` (column indexes) into a `CoverSolution`
     * using `this.columnData`.
     */
    private getPartialSolution(): CoverSolution<Data> {
        const solution = []
        for(const row of this.partialSolution) {
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

    private chooseColumn(): ColumnHeader {
        let chosenCol = this.header.r
        for(
            let col: ColumnHeader | MainHeader = chosenCol.r;
            col !== this.header;
            col = col.r
        ) {
            col = col as ColumnHeader
            if(col.count < chosenCol.count) {
                chosenCol = col
            }
        }
        return chosenCol
    }

    private coverColumn(column: ColumnHeader) {
        // Remove column from header
        column.r.l = column.l
        column.l.r = column.r

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

        // Restore column header
        column.r.l = column
        column.l.r = column
    }
}