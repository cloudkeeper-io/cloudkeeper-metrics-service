import { groupBy, chain, sumBy } from 'lodash'
import { getConnection } from '../../db/db'

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

  return dataPoints
}


export const getCostsPerStack = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select stackName, cast(\`date\` as char) as \`date\`, sum(blendedCost) as blendedCost
                  from CostData
                  where tenantId = ? and blendedCost > 0 and \`date\` >= ? and \`date\` < ?
                  group by stackName, \`date\`
                  order by \`date\` asc, blendedCost desc`

  const result = await connection.query(query, [tenantId, startDate, endDate])

  const dateMap = groupBy(result, 'date')

  const dataPoints = chain(dateMap)
    .map((stackCosts, date) => ({
      date,
      total: sumBy(stackCosts, 'blendedCost'),
      stackCosts,
    }))
    .orderBy(['date'], ['asc'])
    .value()

  return dataPoints
}
