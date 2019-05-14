import * as CostExplorer from 'aws-sdk/clients/costexplorer'
import { DateTime } from 'luxon'
import { flatMap, map } from 'lodash'
import * as AWS from 'aws-sdk'
import { CostData } from '../../entity'
import { getConnection } from '../../db/db'
import { getAwsCredentials } from '../../utils/aws.utils'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.id}`)
  const connection = await getConnection()

  const credentials = await getAwsCredentials(tenant.id, tenant.roleArn)
  const costExplorer = new CostExplorer({ ...credentials, region: 'us-east-1' })

  const start = DateTime
    .utc()
    .startOf('second')
    .minus({ days: 30 })
    .toISODate()

  const end = DateTime
    .utc()
    .startOf('second')
    .toISODate()

  let nextToken

  do {
    const request: CostExplorer.Types.GetCostAndUsageRequest = {
      TimePeriod: {
        Start: start,
        End: end,
      },
      Granularity: 'DAILY',
      GroupBy: [{
        Type: 'DIMENSION',
        Key: 'SERVICE',
      }, {
        Type: 'TAG',
        Key: 'aws:cloudformation:stack-name',
      }],
      Metrics: ['BlendedCost', 'UsageQuantity'],
      NextPageToken: nextToken,
    }

    const response = await costExplorer.getCostAndUsage(request).promise()

    nextToken = response.NextPageToken

    const items = flatMap(response.ResultsByTime, (timeSegment) => {
      const date = timeSegment!.TimePeriod!.Start

      return map(timeSegment.Groups, group => ({
        tenantId: tenant.id,
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
  } while (nextToken)

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: tenant.id,
  }).promise()
}
