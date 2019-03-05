import { reduce } from 'lodash'
import { getConnection } from '../../db/db'

export const getTotals = async (tenantId) => {
  const connection = await getConnection()

  const totalsQuery = 'select sum(invocations) as invocations, sum(`errors`) as `errors`, `dateTime` from LambdaStats '
    + 'where tenantId = ? and (`dateTime` > UTC_TIMESTAMP()  - INTERVAL 1 DAY) '
    + 'group by dateTime '
    + 'order by dateTime desc '

  const dataPoints = await connection.query(totalsQuery, tenantId)

  const totals = reduce(dataPoints, (acc, datapoint) => {
    acc.invocations += Number(datapoint.invocations)
    acc.errors += Number(datapoint.errors)

    return acc
  }, { invocations: 0, errors: 0 })

  return {
    dataPoints,
    totals,
  }
}
