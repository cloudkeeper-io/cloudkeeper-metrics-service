import { DateTime } from 'luxon'
import { map, reduce } from 'lodash'
import { getConnection } from '../db/db'
import { fillEmptyDataPointsWithDates } from '../update/prepare-data/common'

export const handler = async ({ tenantId, startDate, endDate }) => {
  const connection = await getConnection()

  const startDateTime = DateTime.fromISO(startDate, { setZone: true })
  const endDateTime = DateTime.fromISO(endDate, { setZone: true })

  const groupDaily = endDateTime.diff(startDateTime).as('days') > 3

  const offsetName = startDateTime.toFormat('ZZ')

  const dataPoints = await connection.query(`
    select sum(invocations) as invocations, sum(errors) as errors, sum(cost) as cost, 
    ${groupDaily
    ? `CONVERT_TZ(TIMESTAMP(DATE(CONVERT_TZ(dateTime, 'UTC','${offsetName}')), '00:00:00'), 
    '${offsetName}', 'UTC') as dateTime`
    : 'dateTime'
}
    from LambdaStats
    where tenantId = ? and dateTime >= ? and dateTime <=?
    group by ${groupDaily ? `DATE(CONVERT_TZ(dateTime, 'UTC', '${offsetName}'))` : 'dateTime'} order by dateTime asc
  `, [tenantId, DateTime.fromISO(startDate).toISO(), DateTime.fromISO(endDate).toISO()])

  const convertedDataPoints = map(dataPoints, dataPoint => ({
    invocations: Number(dataPoint.invocations),
    errors: Number(dataPoint.errors),
    cost: Number(dataPoint.cost),
    dateTime: DateTime.fromSQL(dataPoint.dateTime).toJSDate(),
  }))

  const fullDataPoints = fillEmptyDataPointsWithDates(
    convertedDataPoints,
    groupDaily,
    DateTime.fromISO(startDate, { setZone: true }).startOf('hour'),
    DateTime.fromISO(endDate, { setZone: true }).startOf('hour'),
    {
      invocations: 0,
      errors: 0,
      cost: 0,
    },
  )


  return reduce(fullDataPoints, (acc, dataPoint) => {
    acc.invocations += dataPoint.invocations
    acc.errors += dataPoint.errors
    acc.cost += dataPoint.cost
    return acc
  }, {
    invocations: 0,
    errors: 0,
    cost: 0,
    dataPoints: fullDataPoints,
  })
}
