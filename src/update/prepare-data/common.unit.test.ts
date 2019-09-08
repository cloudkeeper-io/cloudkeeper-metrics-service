import { DateTime } from 'luxon'
import { fillEmptyDataPoints, fillEmptyDataPointsWithDates } from './common'

describe('test common functions', () => {
  test('fillEmptyDataPoints - 30 days - empty datapoints', () => {
    const dataPoints = fillEmptyDataPoints([], true, 29, { count: 0 })
    expect(dataPoints.length).toBe(29)
  })

  test('fillEmptyDataPoints - 30 days - some datapoints', () => {
    const dataPointsWithSomeData = [{
      dateTime: DateTime.utc().startOf('day').minus({ days: 3 }).toJSDate(),
    }, {
      dateTime: DateTime.utc().startOf('day').minus({ days: 5 }).toJSDate(),
    }]

    const dataPoints = fillEmptyDataPoints(dataPointsWithSomeData, true, 29, { count: 0 })
    expect(dataPoints.length).toBe(29)
  })

  test('fillEmptyDataPoints - 24 hours', () => {
    const dataPoints = fillEmptyDataPoints([], false, 1, { count: 0 })
    expect(dataPoints.length).toBe(24)
  })

  test('fillEmptyDataPoints - 24 hours', () => {
    const dataPointsWithSomeData = [{
      dateTime: DateTime.utc().startOf('hour').minus({ hours: 3 }).toJSDate(),
    }, {
      dateTime: DateTime.utc().startOf('hour').minus({ hours: 5 }).toJSDate(),
    }]

    const dataPoints = fillEmptyDataPoints(dataPointsWithSomeData, false, 1, { count: 0 })
    expect(dataPoints.length).toBe(24)
  })

  test('fillEmptyDataPointsWithDates - 30 days - hourly', () => {
    const dataPoints = fillEmptyDataPointsWithDates([],
      false,
      DateTime.utc().startOf('day').minus({ days: 30 }),
      DateTime.utc().startOf('day'), { count: 0 })

    expect(dataPoints.length).toBe(720)
  })

  test('fillEmptyDataPointsWithDates - 30 days - hourly - weird start date', () => {
    const dataPoints = fillEmptyDataPointsWithDates([],
      false,
      DateTime.utc().startOf('day').minus({ days: 30, minute: 1 }),
      DateTime.utc().startOf('day'), { count: 0 })

    expect(dataPoints.length).toBe(721)
  })

  test('fillEmptyDataPointsWithDates - 30 days - daily', () => {
    const dataPoints = fillEmptyDataPointsWithDates([],
      true,
      DateTime.utc().startOf('day').minus({ days: 30 }),
      DateTime.utc().startOf('day'), { count: 0 })

    expect(dataPoints.length).toBe(30)
  })

  test('fillEmptyDataPointsWithDates - 30 days - daily - weird start date', () => {
    const dataPoints = fillEmptyDataPointsWithDates([],
      true,
      DateTime.utc().startOf('day').minus({ days: 30, minute: 1 }),
      DateTime.utc().startOf('day'), { count: 0 })

    expect(dataPoints.length).toBe(31)
  })
})
