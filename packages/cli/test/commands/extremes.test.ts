import { describe, test, expect } from 'vitest'
import { Config } from '@oclif/core'
import { runCommand } from '@oclif/test'
import nock from 'nock'

nock.disableNetConnect()

describe('extremes', async () => {
  const config = await Config.load(new URL('../..', import.meta.url).pathname)

  test('--station <id>', async () => {
    const { stdout } = await runCommand(
      ['extremes', '--station', '9414290', '--start', '2026-01-01'],
      config
    )
    expect(stdout).toMatch(/SAN FRANCISCO/)
  })

  test('--near 22.24,-75.75', async () => {
    const { stdout } = await runCommand(
      ['extremes', '--near', '22.24,-75.75'],
      config
    )
    expect(stdout).toMatch(/Nurse Channel/)
  })

  test('--ip', async () => {
    nock('https://reallyfreegeoip.org').get('/json/').reply(200, {
      latitude: 25.0565,
      longitude: -77.3524
    })

    const { stdout, error } = await runCommand(['extremes', '--ip'], config)
    expect(error).toBeUndefined()
    expect(stdout).toMatch(/Nassau, New Providence Island/)
  })

  describe('--start', () => {
    test('defaults to today', async () => {
      const today = new Date().toISOString().split('T')[0]

      const { stdout } = await runCommand(
        ['extremes', '--station', '9414290'],
        config
      )
      expect(stdout).toMatch(new RegExp(today))
    })

    test('accepts partial date', async () => {
      const { stdout } = await runCommand(
        ['extremes', '--station', '9414290', '--start', '2025-12-25'],
        config
      )
      expect(stdout).toMatch(/2025-12-25/)
    })

    test('accepts full date', async () => {
      const { stdout } = await runCommand(
        ['extremes', '--station', '9414290', '--start', '2025-12-25T00:00:00Z'],
        config
      )
      expect(stdout).toMatch(/2025-12-25/)
    })

    test('with invalid input', async () => {
      const { error } = await runCommand(
        ['extremes', '--station', '9414290', '--start', 'invalid-date'],
        config
      )
      expect(error?.message).toMatch(/Invalid time value/)
    })
  })

  describe('--end', () => {
    test('defaults to 72 hours from start', async () => {
      const { stdout } = await runCommand(
        ['extremes', '--station', '9414290', '--start', '2025-12-25'],
        config
      )
      expect(stdout).toMatch(/2025-12-27/)
    })

    test('accepts partial date', async () => {
      const { stdout } = await runCommand(
        [
          'extremes',
          '--station',
          '9414290',
          '--start',
          '2025-12-25',
          '--end',
          '2025-12-26'
        ],
        config
      )
      expect(stdout).toMatch(/2025-12-25/)
      expect(stdout).not.toMatch(/2025-12-26/)
    })
  })
})
