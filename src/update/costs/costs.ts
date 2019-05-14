import * as CostExplorer from 'aws-sdk/clients/costexplorer'
import { DateTime } from 'luxon'
import { flatMap, map } from 'lodash'
import { CostData } from '../../entity'
import { getConnection } from '../../db/db'

const costExplorer = new CostExplorer({ region: 'us-east-1' })

export const run = async () => {
  const connection = await getConnection()

  const start = DateTime
    .utc()
    .minus({ days: 30 })
    .toISODate()

  const end = DateTime
    .utc()
    .startOf('second')
    .toISODate()

  const request: CostExplorer.Types.GetCostAndUsageRequest = {
    TimePeriod: {
      Start: start,
      End: end,
    },
    Granularity: 'DAILY',
    GroupBy: [{
      Type: 'DIMENSION',
      Key: 'SERVICE', // 'SERVICE', 'TAGS'
    }, {
      Type: 'TAG',
      Key: 'aws:cloudformation:stack-name',
    }],
    Metrics: ['BlendedCost', 'UsageQuantity'],
  }


  const response = await costExplorer.getCostAndUsage(request).promise()

  const items = flatMap(response.ResultsByTime, (timeSegment) => {
    const date = timeSegment!.TimePeriod!.Start

    return map(timeSegment.Groups, group => ({
      tenantId: 'test',
      serviceName: group.Keys![0],
      stackName: group.Keys![1].split('$')[1],
      blendedCost: group.Metrics!.BlendedCost.Amount,
      date,
    }))
  })

  const query = connection.createQueryBuilder()
    .insert()
    .into(CostData)
    // @ts-ignore
    .values(items)
    .getQuery()
    .replace('INSERT INTO', 'REPLACE INTO')

  const params = flatMap(items, item => [
    item.tenantId,
    item.serviceName,
    item.stackName,
    item.date,
    item.blendedCost,
  ])

  await connection.query(query, params)
}
