import { Duration } from 'luxon'
import { round } from 'lodash'

export const msToDuration = (input: number | string) => {
  const ms = Number(input)

  if (ms > 60000) {
    return Duration.fromMillis(round(ms, -3)).toFormat('m \'min\', s \'sec\'')
  }

  if (ms > 1000) {
    return Duration.fromMillis(round(ms, -3)).toFormat('s \'sec\'')
  }

  return Duration.fromMillis(round(ms)).toFormat('S \'ms\'')
}
