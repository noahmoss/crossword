import React, { useState, useCallback, useRef } from 'react'
import './CrosswordGrid.css'

interface Cell {
    filled: boolean
    number: number | null
    letter: string | null
}

type Direction = 'across' | 'down'

interface Cursor {
    row: number
    col: number
    direction: Direction
}

interface Clues {
    across: [number, string][]
    down: [number, string][]
}

interface CrosswordData {
    filledPositions: string
    width: number | null
    clues: {
        across: Array<[number, string]>
        down: Array<[number, string]>
    }
}

const STARTING_WIDTH = 7

const encodeCrosswordData = (
    cells: readonly Cell[][],
    clues: {
        readonly across: Array<[number, string]>
        readonly down: Array<[number, string]>
    }
): string => {
    // Collecting filled positions
    const filledPositions = cells
        .flatMap((row, rowIndex) =>
            row.map((cell, colIndex) =>
                cell.filled ? `${rowIndex}:${colIndex}` : null
            )
        )
        .filter((position) => position !== null)

    // Creating the crossword data object
    const data: CrosswordData = {
        filledPositions: filledPositions.join(','),
        clues: clues,
        width: STARTING_WIDTH,
    }

    // Encoding the data object to a Base64 string
    const encodedData = btoa(JSON.stringify(data))
    return encodedData
}

console.log(encodeCrosswordData)

const isStartOfWord = (
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

const updateCellsNumbering = (cells: readonly Cell[][]) => {
    let num = 1
    return cells.map((rowArray, rowIndex) =>
        rowArray.map((cell, colIndex) => {
            if (isStartOfWord(cells, rowIndex, colIndex)) {
                return { ...cell, number: num++ }
            }
            return { ...cell, number: null }
        })
    )
}

const initialCells = (): Cell[][] => {
    const queryParams = new URLSearchParams(window.location.search)
    const encodedData = queryParams.get('cw')
    const dataString = encodedData
        ? decodeURIComponent(atob(encodedData))
        : null
    const crosswordData: CrosswordData = dataString
        ? JSON.parse(dataString)
        : null

    const width = crosswordData?.width || STARTING_WIDTH
    const height = width

    const cells: Cell[][] = Array.from({ length: width }, () =>
        Array.from({ length: height }, () => ({
            filled: false,
            number: null,
            letter: null,
        }))
    )

    if (crosswordData && crosswordData.filledPositions) {
        const filledPositions = crosswordData.filledPositions.split(',')
        filledPositions.forEach((position) => {
            const [row, col] = position.split(':').map(Number)
            if (row < height && col < width) {
                cells[row][col].filled = true
            }
        })
    }

    return updateCellsNumbering(cells)
}

const initialClues = (): {
    across: Array<[number, string]>
    down: Array<[number, string]>
} => {
    const queryParams = new URLSearchParams(window.location.search)
    const encodedData = queryParams.get('cw')
    const dataString = encodedData
        ? decodeURIComponent(atob(encodedData))
        : null
    const crosswordData: CrosswordData = dataString
        ? JSON.parse(dataString)
        : null

    if (crosswordData && crosswordData.clues) {
        return crosswordData.clues
    }

    // Return some default or empty clues if none are found in the URL
    return {
        across: [],
        down: [],
    }
}

const findWordBoundaries = (
    cells: Cell[][],
    row: number,
    col: number,
    direction: Direction
) => {
    let start = direction === 'across' ? col : row
    let end = start
    const maxIndex =
        (direction === 'across' ? cells[row].length : cells.length) - 1

    // Search backwards to find the start of the word
    while (start >= 0) {
        const checkCell =
            direction === 'across' ? cells[row][start] : cells[start][col]
        if (checkCell.filled) {
            start++
            break
        }
        if (start === 0) {
            break
        }
        start--
    }

    // Search forwards to find the end of the word
    while (end <= maxIndex) {
        const checkCell =
            direction === 'across' ? cells[row][end] : cells[end][col]
        if (checkCell.filled) {
            end--
            break
        }
        if (end === maxIndex) {
            break
        }
        end++
    }

    return { start, end }
}

// Given a cursor, returns the row and column of the start of the next word. Wraps around to the beginning of the grid if necessary.
const startOfNextWord = (
    cells: Cell[][],
    cursor: Cursor,
    searchDir: 'forwards' | 'backwards'
): Cursor => {
    const { row, col, direction } = cursor
    let currentRow = row
    let currentCol = col

    const height = cells.length
    const width = cells[0].length

    // Helper to check if the current cell is filled
    const isFilled = (r: number, c: number) => cells[r][c].filled

    const advanceCol = () => {
        if (searchDir === 'forwards') currentCol++
        else currentCol--
    }

    const advanceRow = () => {
        if (searchDir === 'forwards') currentRow++
        else currentRow--
    }

    // Move to the next cell in the grid, respecting wrapping
    const moveNext = () => {
        if (direction === 'across') {
            advanceCol()
            if (currentCol >= width) {
                currentCol = 0
                advanceRow()
                if (currentRow >= height) {
                    currentRow = 0
                }
            } else if (currentCol < 0) {
                currentCol = width - 1
                advanceRow()
                if (currentRow < 0) {
                    currentRow = height - 1
                }
            }
        } else {
            // "down"
            advanceRow()
            if (currentRow >= height) {
                currentRow = 0
                advanceCol()
                if (currentCol >= width) {
                    currentCol = 0
                }
            } else if (currentRow < 0) {
                currentRow = height - 1
                advanceCol()
                if (currentCol < 0) {
                    currentCol = width - 1
                }
            }
        }
    }

    // Move to the next cell initially
    moveNext()

    // Skip past the end of the current word (until we hit a filled cell or grid boundary)
    while (!isFilled(currentRow, currentCol)) {
        moveNext()
        // Check if we have reached the end of a line or column
        if (direction === 'across' && currentCol === 0) break
        if (direction === 'down' && currentRow === 0) break
    }

    // Continue to the next unfilled cell, which is the start of the next word
    while (isFilled(currentRow, currentCol)) {
        moveNext()
        // If we reach the beginning of a line or column, stop if it's empty
        if (
            direction === 'across' &&
            currentCol === 0 &&
            !isFilled(currentRow, currentCol)
        )
            break
        if (
            direction === 'down' &&
            currentRow === 0 &&
            !isFilled(currentRow, currentCol)
        )
            break
    }

    return { row: currentRow, col: currentCol, direction }
}

const initialCursor = (cells: Cell[][]): Cursor => {
    for (let row = 0; row < cells.length; row++) {
        for (let col = 0; col < cells[0].length; col++) {
            if (
                !cells[row][col].filled &&
                (col === 0 || cells[row][col - 1].filled)
            ) {
                return { row, col, direction: 'across' }
            }
        }
    }
    return { row: 0, col: 0, direction: 'across' } // Fallback if no starting position is found
}

const CrosswordGrid = () => {
    const [cells, setCells] = useState<Cell[][]>(initialCells())
    const [cursor, setCursor] = useState<Cursor>(initialCursor(cells))
    const [clues] = useState<Clues>(initialClues())
    const hiddenInputRef = useRef<HTMLInputElement>(null)

    const getClassName = (cell: Cell, rowIndex: number, colIndex: number) => {
        const classes = ['grid-cell']
        if (cell.filled) classes.push('filled')

        if (cursor && cursor.row === rowIndex && cursor.col === colIndex) {
            classes.push('cursor')
        }

        if (
            cursor &&
            (cursor.row === rowIndex || cursor.col === colIndex) &&
            !cell.filled
        ) {
            const { start, end } = findWordBoundaries(
                cells,
                cursor.row,
                cursor.col,
                cursor.direction
            )

            if (
                cursor.direction === 'across' &&
                cursor.row === rowIndex &&
                colIndex >= start &&
                colIndex <= end
            ) {
                classes.push('cursor-across')
            }
            if (
                cursor.direction === 'down' &&
                cursor.col === colIndex &&
                rowIndex >= start &&
                rowIndex <= end
            ) {
                classes.push('cursor-down')
            }
        }

        return classes.join(' ')
    }

    const getClueClassName = (
        clue: (string | number)[],
        direction: Direction
    ) => {
        const { row, col } = cursor || {}
        const classes = ['clue-item']

        if (direction === cursor.direction) {
            const { start } = findWordBoundaries(
                cells,
                row,
                col,
                cursor.direction
            )

            // Check if the cursor's current word matches the clue number
            if (
                (direction === 'across' &&
                    cursor.row === row &&
                    clue[0] === cells[row][start]?.number) ||
                (direction === 'down' &&
                    cursor.col === col &&
                    clue[0] === cells[start][col]?.number)
            ) {
                classes.push('active-clue')
            }
        }

        return classes.join(' ')
    }

    const getActiveClue = () => {
        const { row, col, direction } = cursor || {}
        const { start } = findWordBoundaries(cells, row, col, direction)
        if (direction === 'across') {
            const activeClueNumber = cells[row][start]?.number
            return clues.across.find((clue) => clue[0] === activeClueNumber)
        } else {
            const activeClueNumber = cells[start][col]?.number
            return clues.down.find((clue) => clue[0] === activeClueNumber)
        }
    }

    const updateNumbering = useCallback(() => {
        setCells(updateCellsNumbering)
    }, [])

    const handleCellClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>, row: number, col: number) => {
            if (event.shiftKey) {
                setCells((prevCells) => {
                    const newCells = prevCells.map((row) =>
                        row.map((cell) => ({ ...cell }))
                    )
                    newCells[row][col].filled = !newCells[row][col].filled
                    return newCells
                })
                updateNumbering()
            } else {
                // If the cell is not filled, set the cursor to the clicked cell.
                // If an existing cursor is clicked, toggle the direction.
                if (!cells[row][col].filled) {
                    const clickedOnCursor =
                        cursor && cursor.row === row && cursor.col === col
                    const newDirection = clickedOnCursor
                        ? cursor.direction === 'across'
                            ? 'down'
                            : 'across'
                        : cursor?.direction || 'across'
                    setCursor({ row, col, direction: newDirection })

                    hiddenInputRef.current?.focus()
                }
            }
        },
        [cells, cursor, updateNumbering]
    )

    const incrementCursor = useCallback(() => {
        setCursor((prevCursor) => {
            const { end } = findWordBoundaries(
                cells,
                prevCursor.row,
                prevCursor.col,
                prevCursor.direction
            )
            if (prevCursor.direction === 'across' && prevCursor.col < end) {
                return {
                    row: prevCursor.row,
                    col: prevCursor.col + 1,
                    direction: prevCursor.direction,
                }
            }
            if (prevCursor.direction === 'down' && prevCursor.row < end) {
                return {
                    row: prevCursor.row + 1,
                    col: prevCursor.col,
                    direction: prevCursor.direction,
                }
            }
            return prevCursor
        })
    }, [cells])

    const handleKeyInput = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (/^[A-Z]$/.test(event.key.toUpperCase())) {
                if (cursor) {
                    setCells((prevCells) => {
                        const newCells = prevCells.map((row) =>
                            row.map((cell) => ({ ...cell }))
                        )
                        newCells[cursor.row][cursor.col].letter =
                            event.key.toUpperCase()
                        return newCells
                    })
                }
                incrementCursor()
            }

            if (event.code === 'Tab') {
                event.preventDefault()
                setCursor((prevCursor) => {
                    return startOfNextWord(
                        cells,
                        prevCursor,
                        event.shiftKey ? 'backwards' : 'forwards'
                    )
                })
            }

            if (event.code === 'Space') {
                setCursor((prevCursor) => {
                    if (prevCursor) {
                        return {
                            ...prevCursor,
                            direction:
                                prevCursor.direction === 'across'
                                    ? 'down'
                                    : 'across',
                        }
                    }
                    return prevCursor
                })
            }

            if (event.code === 'Backspace') {
                if (cursor) {
                    const currentCell = cells[cursor.row][cursor.col]
                    if (currentCell.letter) {
                        // If there is a letter in the current cell, delete it and leave the cursor in place
                        setCells((prevCells) => {
                            const newCells = prevCells.map((row) =>
                                row.map((cell) => ({ ...cell }))
                            )
                            newCells[cursor.row][cursor.col].letter = null
                            return newCells
                        })
                    } else {
                        // If there is no letter, move back one cell
                        const { start } = findWordBoundaries(
                            cells,
                            cursor.row,
                            cursor.col,
                            cursor.direction
                        )
                        if (
                            (cursor.direction === 'across' &&
                                cursor.col === start) ||
                            (cursor.direction === 'down' &&
                                cursor.row === start)
                        ) {
                            // If at the start, move to the last letter of the previous word
                            const prevCursor = startOfNextWord(
                                cells,
                                cursor,
                                'backwards'
                            )
                            if (prevCursor) {
                                const { end: prevEnd } = findWordBoundaries(
                                    cells,
                                    prevCursor.row,
                                    prevCursor.col,
                                    cursor.direction
                                )
                                setCursor({
                                    row: prevCursor.row,
                                    col: prevCursor.col,
                                    direction: cursor.direction,
                                })
                                setCells((prevCells) => {
                                    const newCells = prevCells.map((row) =>
                                        row.map((cell) => ({ ...cell }))
                                    )
                                    if (cursor.direction === 'across') {
                                        newCells[prevCursor.row][
                                            prevEnd
                                        ].letter = null
                                    } else {
                                        newCells[prevEnd][
                                            prevCursor.col
                                        ].letter = null
                                    }
                                    return newCells
                                })
                            }
                        } else {
                            // Move back within the current word
                            setCursor((prevCursor) => {
                                if (prevCursor) {
                                    if (cursor.direction === 'across') {
                                        return {
                                            ...prevCursor,
                                            col: prevCursor.col - 1,
                                        }
                                    } else {
                                        return {
                                            ...prevCursor,
                                            row: prevCursor.row - 1,
                                        }
                                    }
                                }
                                return prevCursor
                            })
                            setCells((prevCells) => {
                                const newCells = prevCells.map((row) =>
                                    row.map((cell) => ({ ...cell }))
                                )
                                if (cursor.direction === 'across') {
                                    newCells[cursor.row][
                                        cursor.col - 1
                                    ].letter = null
                                } else {
                                    newCells[cursor.row - 1][
                                        cursor.col
                                    ].letter = null
                                }
                                return newCells
                            })
                        }
                    }
                }
            }

            const { row, col, direction } = cursor || {}

            switch (event.code) {
                case 'ArrowUp':
                    if (direction === 'down') {
                        setCursor({ ...cursor, row: row - 1 })
                    } else if (
                        direction === 'across' &&
                        row > 0 &&
                        !cells[row - 1][col].filled
                    ) {
                        setCursor({ ...cursor, direction: 'down' })
                    }
                    break
                case 'ArrowDown':
                    if (direction === 'down') {
                        setCursor({ ...cursor, row: row + 1 })
                    } else if (
                        direction === 'across' &&
                        row < cells.length - 1 &&
                        !cells[row + 1][col].filled
                    ) {
                        setCursor({ ...cursor, direction: 'down' })
                    }
                    break
                case 'ArrowLeft':
                    if (direction === 'across') {
                        setCursor({ ...cursor, col: col - 1 })
                    } else if (
                        direction === 'down' &&
                        col > 0 &&
                        !cells[row][col - 1].filled
                    ) {
                        setCursor({ ...cursor, direction: 'across' })
                    }
                    break
                case 'ArrowRight':
                    if (direction === 'across') {
                        setCursor({ ...cursor, col: col + 1 })
                    } else if (
                        direction === 'down' &&
                        col < cells[0].length - 1 &&
                        !cells[row][col + 1].filled
                    ) {
                        setCursor({ ...cursor, direction: 'across' })
                    }
                    break
                default:
                    break
            }
        },
        [cells, cursor, incrementCursor]
    )

    // const clues1: Clues = {
    //   across: [
    //     [1, 'Constricting snake'],
    //     [4, 'Holy shrine in Mecca'],
    //     [6, 'Southwest capital'],
    //     [8, 'Attorney\'s org.'],
    //     [9, 'Upcharged milk option'],
    //     [10, 'Phil of TV'],
    //     [12, 'What you\'re solving, and are (absolutely) about to eat'],
    //     [13, 'Grass turf']
    //   ],
    //   down: [
    //     [1, 'This shit is ___'],
    //     [2, 'Upcharged milk option'],
    //     [3, 'Embarrassed'],
    //     [4, 'Meat on a stick (alternate spelling)'],
    //     [5, 'Not a good way to run'],
    //     [6, 'Feeling down (but not today!)'],
    //     [7, 'Organ that might be private'],
    //     [11, 'Many years ___']
    //   ],
    // };

    // const clues2: Clues = {
    //   across: [
    //     [1, 'Nonsense, to Brits'],
    //     [5, 'African language group'],
    //     [6, 'Huge quantity (of)'],
    //     [7, 'Sure, however...'],
    //     [8, 'What we have 2pm tickets for!'],
    //   ],
    //   down: [
    //     [1, 'In bad taste'],
    //     [2, 'End of an era?'],
    //     [3, 'Dutch oven maker'],
    //     [4, '___ and peck'],
    //     [5, 'Benefit']
    //   ]
    // }

    // const clues3: Clues = {
    //   across: [
    //     [1, 'Tater unit'],
    //     [4, 'If ___ a Hammer'],
    //     [6, 'Energize'],
    //     [8, 'Healthy, in Madrid'],
    //     [9, 'Pommes frites topping'],
    //   ],
    //   down: [
    //     [1, 'An aunt eating 3-Down'],
    //     [2, 'Resistance units'],
    //     [3, 'Our dinner plans!'],
    //     [5, 'IMAX desert planet'],
    //     [7, 'D.C. insider']
    //   ]
    // }
    //
    // const clues4: Clues = {
    //     across: [
    //         [1, 'Auditing org.'],
    //         [4, "Cobbler's tool"],
    //         [7, 'Snare sound'],
    //         [9, 'In public'],
    //         [10, 'More likely to enjoy crosswords'],
    //         [11, 'Ogles'],
    //         [12, 'Number of years since we were last here'],
    //     ],
    //     down: [
    //         [1, 'Do a pressing chore?'],
    //         [2, 'String Quartet in F composer'],
    //         [3, '-phonic prefix'],
    //         [4, 'A flannel and jeans, perhaps'],
    //         [5, "Cardiff's country"],
    //         [6, 'About 5.88 trillion mi.'],
    //         [8, 'Parade director Michael'],
    //     ],
    // }

    const activeClue = getActiveClue()

    return (
        <div className="crossword-container">
            <div className="grid-container no-select">
                <div className="active-clue-bar">
                    {activeClue && (
                        <>
                            <span className="clue-number">{activeClue[0]}</span>
                            <span className="clue-text">{activeClue[1]}</span>
                        </>
                    )}
                </div>
                <div className="grid">
                    <input
                        ref={hiddenInputRef}
                        type="text" // Ensures a basic keyboard
                        autoComplete="off" // Disables autocomplete
                        autoCorrect="off" // Disables autocorrect
                        autoCapitalize="none" // Prevents automatic capitalization
                        spellCheck="false" // Disables spell checking
                        className="hidden-input"
                        onKeyDown={handleKeyInput}
                        onBlur={() => hiddenInputRef.current?.focus()}
                        onChange={() => {}}
                        autoFocus
                        value=""
                    />
                    {cells.map((rowArray, rowIndex) => (
                        <div key={rowIndex} className="grid-row">
                            {rowArray.map((cell, colIndex) => (
                                <div
                                    tabIndex={-1}
                                    key={colIndex}
                                    className={getClassName(
                                        cell,
                                        rowIndex,
                                        colIndex
                                    )}
                                    onClick={(event) =>
                                        handleCellClick(
                                            event,
                                            rowIndex,
                                            colIndex
                                        )
                                    }
                                >
                                    {cell.number !== null && (
                                        <div className="cell-number">
                                            {cell.number}
                                        </div>
                                    )}
                                    {cell.letter !== null && (
                                        <div className="cell-letter">
                                            {cell.letter}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="clues-panel">
                <div
                    className={`clues-across ${cursor.direction === 'across' ? 'active' : ''}`}
                >
                    <span className="clues-header">Across</span>
                    <ul>
                        {clues.across.map((clue) => (
                            <li
                                className={getClueClassName(clue, 'across')}
                                key={`across-${clue[0]}`}
                            >
                                <span className="clue-number">{clue[0]}</span>
                                <span className="clue-text">{clue[1]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div
                    className={`clues-down ${cursor.direction === 'down' ? 'active' : ''}`}
                >
                    <span className="clues-header">Down</span>
                    <ul>
                        {clues.down.map((clue) => (
                            <li
                                className={getClueClassName(clue, 'down')}
                                key={`across-${clue[0]}`}
                            >
                                <span className="clue-number">{clue[0]}</span>
                                <span className="clue-text">{clue[1]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default CrosswordGrid
