import csv from 'csvtojson'
import { TextDecoder } from 'text-encoding-polyfill'

export function bufferToString(buffer: Buffer) {
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
}

function parseWith(buffer: Buffer, options = {}) {
  return csv({ noheader: true, output: 'csv', ...options }).fromString(
    bufferToString(buffer),
  )
}

export interface Row {
  id: string
  cells: {
    text?: string
  }[]
}

export interface RowSet {
  isLoaded: boolean
  rows: Row[]
}

interface ParseOptions {
  hasColumnNameLine: boolean
  columnNameLineNumber: number
}

export interface Column {
  name: string
  dataType: { type: string }
  isDerived?: boolean
}

async function dataToSpreadsheetSnapshot(
  rows: string[][],
  options: ParseOptions = { hasColumnNameLine: false, columnNameLineNumber: 1 },
) {
  // rows is an array of row objects and columnNames
  // is an array of column names (in import order)
  let maxCols = 0
  const rowSet: RowSet = {
    isLoaded: true,
    rows: rows.map((row, rowNumber) => {
      if (row.length > maxCols) maxCols = row.length
      return {
        id: String(rowNumber),
        cells: row.map((text, columnNumber) => {
          return { columnNumber, text }
        }),
      }
    }),
  }

  // process the column names row if present
  const columnNames: Record<string, string> = {}
  if (options.hasColumnNameLine) {
    const [colNamesRow] = rowSet.rows.splice(
      options.columnNameLineNumber - 1,
      1,
    )

    if (colNamesRow) {
      colNamesRow.cells.forEach((cell, columnNumber) => {
        columnNames[columnNumber] = cell.text || ''
      })
    }
  }

  const columns: Column[] = []
  const columnDisplayOrder = []
  for (let i = 0; i < maxCols; i += 1) {
    columnDisplayOrder.push(i)
    columns[i] = { name: columnNames[i], dataType: { type: 'Text' } }
  }

  return {
    rowSet,
    columnDisplayOrder,
    hasColumnNames: !!options.hasColumnNameLine,
    columns,
  }
}

export function parseCsvBuffer(
  buffer: Buffer,
  options: ParseOptions = { hasColumnNameLine: false, columnNameLineNumber: 1 },
) {
  return parseWith(buffer).then(rows =>
    dataToSpreadsheetSnapshot(rows, options),
  )
}

export function parseTsvBuffer(
  buffer: Buffer,
  options: ParseOptions = { hasColumnNameLine: false, columnNameLineNumber: 1 },
) {
  return parseWith(buffer, { delimiter: '\t' }).then(rows =>
    dataToSpreadsheetSnapshot(rows, options),
  )
}

export function parseBedBuffer(buffer: Buffer) {
  return parseTsvBuffer(buffer).then(data => {
    const bedColumns = [
      { name: 'chrom', dataType: { type: 'Text' } },
      { name: 'chromStart', dataType: { type: 'Number' } },
      { name: 'chromEnd', dataType: { type: 'Number' } },
      { name: 'name', dataType: { type: 'Text' } },
      { name: 'score', dataType: { type: 'Number' } },
      { name: 'strand', dataType: { type: 'Text' } },
    ]
    data.columns.forEach((col, colNumber) => {
      const bedColumn = bedColumns[colNumber]
      if (bedColumn) {
        col.name = bedColumn.name
        col.dataType = bedColumn.dataType
      }
    })
    data.hasColumnNames = true
    return data
  })
}