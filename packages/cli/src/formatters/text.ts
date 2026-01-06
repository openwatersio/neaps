import type { FormatterFactory } from './index.js'
import { Console } from 'console'

const formatter: FormatterFactory = function (stdout) {
  const console = new Console(stdout)

  return {
    extremes(prediction) {
      console.log(`Station: ${prediction.station.name}`)
      console.log(`Datum: ${prediction.datum}`)

      prediction.extremes.forEach((extreme) => {
        console.log(
          `${extreme.time.toISOString()} | ${extreme.high ? 'High' : 'Low '} | ${extreme.level.toFixed(
            2
          )} ${prediction.units === 'meters' ? 'm' : 'ft'}`
        )
      })
    },

    listStations(stations) {
      stations.forEach((s) => {
        console.log(`${s.id}\t${s.name} (${s.country})`)
      })
    },

    toString: () => 'text'
  }
}

export default formatter
