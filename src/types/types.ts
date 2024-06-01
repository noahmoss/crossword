export interface Cell {
    filled: boolean
    number: number | null
    letter: string | null
}

export type Grid = Cell[][]

export type Direction = 'across' | 'down'

export interface Cursor {
    row: number
    col: number
    direction: Direction
}

export interface Clues {
    across: [number, string][]
    down: [number, string][]
}

export interface CrosswordData {
    filledPositions: string
    width: number | null
    height: number | null
    clues: {
        across: Array<[number, string]>
        down: Array<[number, string]>
    }
}
