import { BaseCommand } from '../command.js'
import { Args, Flags } from '@oclif/core'
import { stations } from '@neaps/tide-database'
import { stationsNear } from 'neaps'

export default class Stations extends BaseCommand {
  static override description = 'List available tide stations'

  static override args = {
    query: Args.string({ description: 'Station name or id' })
  }

  static override flags = {
    all: Flags.boolean({
      description: 'List all stations. Same as setting --limit=0',
      exclusive: ['limit']
    }),
    limit: Flags.integer({
      description: 'Limit number of stations displayed',
      default: 10,
      exclusive: ['all']
    }),
    near: Flags.string({
      description: 'Use specified lat,lon to find nearest stations',
      helpValue: '<lat,lon>'
    })
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Stations)

    if (flags.all) flags.limit = 0

    let list = stations

    if (flags.near) {
      const [lat, lon] = flags.near.split(',').map(Number)
      list = stationsNear({ lat, lon }, Number(flags.limit))
    }

    if (args.query) {
      const search = args.query.toLowerCase()
      list = list.filter(
        (s) => s.id.includes(search) || s.name.toLowerCase().includes(search)
      )
    }

    if (flags.limit > 0) {
      list = list.slice(0, flags.limit)
    }

    if (!list.length) throw new Error('No stations found')

    flags.format.listStations(list)
  }
}
