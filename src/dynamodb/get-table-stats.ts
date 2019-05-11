import { reduce } from 'lodash'
import { DateTime } from 'luxon'
import { getConnection } from '../db/db'
import { fillEmptyDataPointsWithDates } from '../update/prepare-data/common'

export const handler = async (request) => {
  const { name, region, tenantId, startDate, endDate } = request

  const connection = await getConnection()

  const dataPoints = await connection.query(`select * from DynamoTableStats where tenantId = ? and 
        name = ? and region = ? and dateTime >= ? and dateTime <= ?`,
  [tenantId, name, region, startDate, endDate])

  const startDateTime = DateTime.fromISO(startDate).startOf('hour')
  const endDateTime = DateTime.fromISO(endDate).startOf('hour')

  const fullDataPoints = fillEmptyDataPointsWithDates(dataPoints, false, startDateTime, endDateTime, {
    consumedRead: '0',
    consumedWrite: '0',
    provisionedRead: '0',
    provisionedWrite: '0',
    throttledReads: '0',
    throttledWrites: '0',
    lambdaName: name,
    region,
  })

  const totals = reduce(fullDataPoints, (acc, dataPoint) => {
    acc.totalConsumedRead += Number(dataPoint.consumedRead)
    acc.totalConsumedWrite += Number(dataPoint.consumedWrite)
    acc.totalProvisionedRead += Number(dataPoint.provisionedRead)
    acc.totalProvisionedWrite += Number(dataPoint.provisionedWrite)
    acc.totalThrottledReads += Number(dataPoint.throttledReads)
    acc.totalThrottledWrites += Number(dataPoint.throttledWrites)

    return acc
  }, {
    totalConsumedRead: 0,
    totalConsumedWrite: 0,
    totalProvisionedRead: 0,
    totalProvisionedWrite: 0,
    totalThrottledReads: 0,
    totalThrottledWrites: 0,
  })

  return {
    ...totals,
    dataPoints: fullDataPoints,
  }
}
