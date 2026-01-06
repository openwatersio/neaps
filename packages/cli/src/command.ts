import { Command, Flags } from '@oclif/core'
import getFormat, {
  availableFormats,
  type Formats,
  type Formatter
} from './formatters/index.js'

export abstract class BaseCommand extends Command {
  static baseFlags = {
    format: Flags.custom<Formatter>({
      parse: async (input: string) => getFormat(input as Formats),
      default: async () => getFormat('text'),
      helpValue: `<${availableFormats.join('|')}>`,
      description: 'Output format'
    })()
  }
}
