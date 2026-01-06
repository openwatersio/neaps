import text from './text.js'
import json from './json.js'
import type { Station } from '@neaps/tide-database'
import { getExtremesPrediction } from 'neaps'

export const formatters = {
  text,
  json
}

export type Formats = keyof typeof formatters
export type FormatterFactory = (stdout: NodeJS.WriteStream) => Formatter
// TODO: export a proper type from neaps
export type ExtremesPrediction = ReturnType<typeof getExtremesPrediction>

export interface Formatter {
  extremes(prediction: ExtremesPrediction): void
  listStations(stations: Station[]): void
}

export const availableFormats = Object.keys(formatters) as Formats[]

export default function getFormat(
  format: Formats,
  stdout: NodeJS.WriteStream = process.stdout
): Formatter {
  const formatter = formatters[format]
  if (!formatter) {
    throw new Error(`Unknown output format: ${format}`)
  }
  return formatter(stdout)
}
