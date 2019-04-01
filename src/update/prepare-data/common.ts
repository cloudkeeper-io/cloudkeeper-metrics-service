import { DateTime, Interval, Duration } from 'luxon'

export const getDateCondition = (groupDaily, parameterString = '?') => {
  if (groupDaily) {
    return `(DATE(\`dateTime\`) > DATE(UTC_TIMESTAMP()) - INTERVAL ${parameterString} DAY) `
  }
  return `(\`dateTime\` >= UTC_TIMESTAMP()  - INTERVAL ${parameterString} DAY - INTERVAL 1 HOUR) `
}


export const fillEmptyDataPoints = (dataPoints, groupDaily, daysAgo, emptyDataPoint) => {
  const endDate = DateTime.utc().startOf('hour')
  const startDate = DateTime.utc().startOf('hour').minus({ days: daysAgo }).toJSDate()
  const expectedDates = Interval.fromDateTimes(startDate, endDate).splitBy(Duration.fromMillis(groupDaily ? 24 * 3600 * 1000 : 3600 * 1000))
}
