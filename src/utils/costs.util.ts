import * as CostExplorer from 'aws-sdk/clients/costexplorer'
import { flatMap, map } from 'lodash'
import { getAwsCredentials } from './aws.utils'

export const getCostsData = async (tenantId, roleArn, startDate, endDate) => {
  const credentials = await getAwsCredentials(tenantId, roleArn)
  const costExplorer = new CostExplorer({ ...credentials, region: 'us-east-1' })

  let result: any[] = []
  let nextToken

  do {
    const request: CostExplorer.Types.GetCostAndUsageRequest = {
      TimePeriod: {
        Start: startDate,
        End: endDate,
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
        tenantId,
        serviceName: group.Keys![0],
        stackName: group.Keys![1].split('$')[1],
        blendedCost: group.Metrics!.BlendedCost.Amount,
        date,
      }))
    })

    result = [...result, ...items]
  } while (nextToken)

  return result
}
