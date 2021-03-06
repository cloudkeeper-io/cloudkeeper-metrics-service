/* eslint-disable import/no-extraneous-dependencies */
import * as AWS from 'aws-sdk'
import { get } from 'lodash'
import { DateTime } from 'luxon'
import { getAwsCredentials } from './aws.utils'

export const listTables = async (tenantId, roleArn, region) => {
  const credentials = await getAwsCredentials(tenantId, roleArn)
  const dynamoDb = new AWS.DynamoDB({ ...credentials, region })

  const tableNamesResponse = await dynamoDb.listTables().promise()

  if (!tableNamesResponse || !tableNamesResponse.TableNames) {
    return []
  }

  const tables: any[] = []

  for (const tableName of get(tableNamesResponse as any, 'TableNames', [])) {
    const table = await dynamoDb.describeTable({
      TableName: tableName,
    }).promise()

    tables.push({
      tenantId,
      name: table.Table!.TableName,
      region,
      billingMode: get(table, 'Table.BillingModeSummary.BillingMode', 'PROVISIONED'),
      sizeBytes: table.Table!.TableSizeBytes,
      items: table.Table!.ItemCount,
    })
  }

  return tables
}

const period = 3600

export const createDynamoMetric = (tableName, metricName, stats, startTime, endTime) => ({
  StartTime: startTime,
  Namespace: 'AWS/DynamoDB',
  EndTime: endTime,
  MetricName: metricName,
  Period: period,
  Statistics: stats,
  Dimensions: [
    {
      Name: 'TableName',
      Value: tableName,
    },
  ],
})


export const getTableMetrics = async (tableName, tenantId, roleArn, region) => {
  const credentials = await getAwsCredentials(tenantId, roleArn)
  const cloudwatch = new AWS.CloudWatch({ ...credentials, region })

  const startTime = DateTime.utc().startOf('hour').minus({ days: 30 }).toJSDate()
  const endTime = DateTime.utc().startOf('hour').toJSDate()

  const requests = [
    createDynamoMetric(tableName, 'ConsumedReadCapacityUnits', ['Sum'], startTime, endTime),
    createDynamoMetric(tableName, 'ConsumedWriteCapacityUnits', ['Sum'], startTime, endTime),
    createDynamoMetric(tableName, 'ProvisionedReadCapacityUnits', ['Average'], startTime, endTime),
    createDynamoMetric(tableName, 'ProvisionedWriteCapacityUnits', ['Average'], startTime, endTime),
    createDynamoMetric(tableName, 'ReadThrottleEvents', ['Sum'], startTime, endTime),
    createDynamoMetric(tableName, 'WriteThrottleEvents', ['Sum'], startTime, endTime),
  ]

  return Promise.all(requests.map(request => cloudwatch.getMetricStatistics(request).promise()))
}
