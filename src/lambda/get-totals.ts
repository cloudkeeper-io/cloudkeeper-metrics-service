import { DateTime } from 'luxon'
import { reduce } from 'lodash'
import { getConnection } from '../db/db'
import { fillEmptyDataPointsWithDates } from '../update/prepare-data/common'

export const handler = async ({ tenantId, startDate, endDate }) => {
  const connection = await getConnection()

  const dataPoints = await connection.query(`
    select sum(invocations) as invocations, sum(errors) as errors, dateTime
    from LambdaStats
    where tenantId = ? and dateTime >= ? and dateTime <=?
    group by dateTime order by dateTime asc
  `, [tenantId, startDate, endDate])

  const fullDataPoints = fillEmptyDataPointsWithDates(
    dataPoints,
    false,
    DateTime.fromISO(startDate).plus({ hours: 1 }).startOf('hour'),
    DateTime.fromISO(endDate).startOf('hour'),
    {
      invocations: '0',
      errors: '0',
    },
  )


  return reduce(fullDataPoints, (acc, dataPoint) => {
    acc.invocations += Number(dataPoint.invocations)
    acc.errors += Number(dataPoint.errors)
    return acc
  }, {
    invocations: 0,
    errors: 0,
    dataPoints: fullDataPoints,
  })
}
