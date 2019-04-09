import { DateTime } from 'luxon'
import { fillEmptyDataPoints } from './common'

describe('test common functions', () => {
  test('fillEmptyDataPoints - 30 days - empty datapoints', async () => {
    const dataPoints = fillEmptyDataPoints([], true, 30, { count: 0 })
    expect(dataPoints.length).toBe(30)
  })

  test('fillEmptyDataPoints - 30 days - some datapoints', async () => {
    const dataPointsWithSomeData = [{
      dateTime: DateTime.utc().startOf('day').minus({ days: 3 }).toJSDate(),
    }, {
      dateTime: DateTime.utc().startOf('day').minus({ days: 5 }).toJSDate(),
    }]

    const dataPoints = fillEmptyDataPoints(dataPointsWithSomeData, true, 30, { count: 0 })
    expect(dataPoints.length).toBe(30)
  })

  test('fillEmptyDataPoints - 24 hours', async () => {
    const dataPoints = fillEmptyDataPoints([], false, 1, { count: 0 })
    expect(dataPoints.length).toBe(24)
  })

  test('fillEmptyDataPoints - 24 hours', async () => {
    const dataPointsWithSomeData = [{
      dateTime: DateTime.utc().startOf('hour').minus({ hours: 3 }).toJSDate(),
    }, {
      dateTime: DateTime.utc().startOf('hour').minus({ hours: 5 }).toJSDate(),
    }]

    const dataPoints = fillEmptyDataPoints(dataPointsWithSomeData, false, 1, { count: 0 })
    expect(dataPoints.length).toBe(24)
  })
})