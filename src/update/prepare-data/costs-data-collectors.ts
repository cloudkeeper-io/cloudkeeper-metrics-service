import { chain, groupBy, sumBy } from 'lodash'
import { DateTime } from 'luxon'
import { getConnection } from '../../db/db'
import { fillEmptyDataPointsWithDates } from './common'

export const getCostsPerService = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select serviceName, cast(\`date\` as char) as \`date\`, sum(blendedCost) as blendedCost
                  from CostData
                  where tenantId = ? and blendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by serviceName, \`date\`
                  order by \`date\` asc, blendedCost desc`

  const result = await connection.query(query, [tenantId, startDate, endDate])

  const dateMap = groupBy(result, 'date')

  const dataPoints = chain(dateMap)
    .map((serviceCosts, date) => ({
      date,
      total: sumBy(serviceCosts, 'blendedCost'),
      serviceCosts,
    }))
    .orderBy(['date'], ['asc'])
    .value()

  // TODO: fill in empty data points

  return dataPoints
}

export const getCostsForService = async (tenantId, serviceName, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select serviceName, \`date\` as \`dateTime\`, sum(blendedCost) as cost
                  from CostData
                  where tenantId = ? and serviceName = ? and blendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by serviceName, \`dateTime\`
                  order by \`dateTime\` asc, blendedCost desc`

  const result = await connection.query(query, [tenantId, serviceName, startDate, endDate])

  const startDateTime = DateTime.fromISO(startDate, { zone: 'utc' }).startOf('hour')
  const endDateTime = DateTime.fromISO(endDate, { zone: 'utc' }).startOf('hour')

  const dataPoints = fillEmptyDataPointsWithDates(result, true, startDateTime, endDateTime, {
    cost: 0,
    serviceName,
  })

  return dataPoints
}

export const getCostsPerStack = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select stackName, cast(\`date\` as char) as \`date\`, sum(blendedCost) as blendedCost
                  from CostData
                  where tenantId = ? and blendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by stackName, \`date\`
                  order by \`date\` asc, blendedCost desc`

  const result = await connection.query(query, [tenantId, startDate, endDate])

  const dateMap = groupBy(result, 'date')

  // TODO: fill in empty data points

  return chain(dateMap)
    .map((stackCosts, date) => ({
      date,
      total: sumBy(stackCosts, 'blendedCost'),
      stackCosts,
    }))
    .orderBy(['date'], ['asc'])
    .value()
}
