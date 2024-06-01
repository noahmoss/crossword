import { Grid, Cell, Cursor } from '../types/types'

const rowCount = (grid: Grid) => {
    return grid.length
}

const colCount = (grid: Grid) => {
    return grid[0].length
}

export const findWordBoundaries = (grid: Grid, cursor: Cursor) => {
    const { row, col, direction } = cursor
    let currentCellInWord = (index: number): Cell =>
        direction === 'across' ? grid[row][index] : grid[index][col]
    const maxIndex =
        (direction === 'across' ? colCount(grid) : rowCount(grid)) - 1

    // Search backwards to find the start of the word
    let wordStart = direction === 'across' ? col : row
    let wordEnd = wordStart
    while (wordStart >= 0 && !currentCellInWord(wordStart).filled) {
        wordStart -= 1
    }
    wordStart += 1

    // Search forwards to find the end of the word
    while (wordEnd <= maxIndex && !currentCellInWord(wordEnd).filled) {
        wordEnd += 1
    }
    wordEnd -= 1

    return { wordStart, wordEnd }
}

export const isStartOfWord = (
    cells: readonly Cell[][],
    rowIndex: number,
    colIndex: number
) => {
    return (
        !cells[rowIndex][colIndex].filled &&
        (colIndex === 0 ||
            cells[rowIndex][colIndex - 1].filled ||
            rowIndex === 0 ||
            cells[rowIndex - 1][colIndex].filled)
    )
}
