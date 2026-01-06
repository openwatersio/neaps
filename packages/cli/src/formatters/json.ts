import type { FormatterFactory } from './index.js'

const formatter: FormatterFactory = function (stdout) {
  function write(data: object) {
    stdout.write(JSON.stringify(data, null, 2))
    stdout.write('\n')
  }

  return {
    extremes: write,
    listStations: write,
    toString: () => 'text'
  }
}

export default formatter
