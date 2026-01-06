import { BaseCommand } from '../command.js'
import { Flags } from '@oclif/core'
import { findStation, nearestStation } from 'neaps'

export default class Extremes extends BaseCommand {
  static override description = 'Get tide extremes for a station'

  static override flags = {
    station: Flags.string({
      description: 'Use the specified station ID',
      helpValue: '<station-id>',
      exclusive: ['near', 'ip']
    }),
    ip: Flags.boolean({
      default: false,
      description: 'Use IP geolocation to find nearest station',
      exclusive: ['station', 'near']
    }),
    near: Flags.string({
      description: 'Use specified lat,lon to find nearest station',
      helpValue: 'lat,lon',
      exclusive: ['station', 'ip']
    }),
    start: Flags.string({
      description: 'ISO date',
      default: new Date().toISOString(),
      parse: async (input: string) => new Date(input).toISOString(),
      noCacheDefault: true,
      validate: (input: string) => new Date(input),
      helpValue: 'YYYY-MM-DD'
    }),
    end: Flags.string({
      description: 'ISO date',
      helpValue: 'YYYY-MM-DD'
    }),
    units: Flags.string({
      description: 'Units for output (meters or feet)',
      default: 'meters',
      helpValue: '<meters|feet>'
    })
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Extremes)

    const station = await getStation(flags)
    const start = new Date(flags.start)
    const end = flags.end
      ? new Date(flags.end)
      : new Date(start.getTime() + 72 * 60 * 60 * 1000)

    const prediction = station.getExtremesPrediction({
      start,
      end,
      units: flags.units as 'meters' | 'feet'
    })

    flags.format.extremes(prediction)
  }
}

async function getStation({
  station,
  near,
  ip
}: {
  station?: string
  near?: string
  ip?: boolean
}) {
  if (station) {
    return findStation(station)
  }

  if (near) {
    const [lat, lon] = near.split(',').map(Number)
    return nearestStation({ latitude: lat, longitude: lon })
  }

  if (ip) {
    const res = await fetch('https://reallyfreegeoip.org/json/')
    if (!res.ok)
      throw new Error(`Failed to fetch IP geolocation: ${res.statusText}`)
    return nearestStation(await res.json())
  } else {
    throw new Error('No station specified. Use --station or --ip flag.')
  }
}
