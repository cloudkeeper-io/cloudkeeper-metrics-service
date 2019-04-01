import { DateTime, Interval, Duration } from 'luxon'
import { map, differenceBy, orderBy } from 'lodash'

export const getDateCondition = (groupDaily, parameterString = '?') => {
  if (groupDaily) {
    return `(DATE(\`dateTime\`) > DATE(UTC_TIMESTAMP()) - INTERVAL ${parameterString} DAY) `
  }
  return `(\`dateTime\` >= UTC_TIMESTAMP()  - INTERVAL ${parameterString} DAY - INTERVAL 1 HOUR) `
}


export const fillEmptyDataPoints = (dataPoints, groupDaily, daysAgo, emptyDataPoint) => {
  const endDate = DateTime.utc().minus({ hour: 1 }).startOf(groupDaily ? 'day' : 'hour')

  const startDate = endDate.minus({ days: daysAgo })
  const expectedDates = map(
    Interval
      .fromDateTimes(startDate, endDate)
      .splitBy(Duration.fromMillis(groupDaily ? 24 * 3600 * 1000 : 3600 * 1000)),
    interval => interval.end.toJSDate(),
  )

  const existingDates = map(dataPoints, 'dateTime')

  const datesToFillIn = differenceBy(expectedDates, existingDates, dateTime => dateTime.getTime())

  const dataPointsToAdd = map(datesToFillIn, dateTime => ({ ...emptyDataPoint, dateTime }))

  const completeDataPoints = [...dataPoints, ...dataPointsToAdd]

  return orderBy(completeDataPoints, ['dateTime'], ['asc'])
}
