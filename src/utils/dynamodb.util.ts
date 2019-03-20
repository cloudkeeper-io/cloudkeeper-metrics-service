/* eslint-disable import/no-extraneous-dependencies */
import * as AWS from 'aws-sdk'
import { get } from 'lodash'
import { DateTime } from 'luxon'

export const listTables = async (tenantId, accessKeyId, secretAccessKey, region) => {
  const dynamoDb = new AWS.DynamoDB({ accessKeyId, secretAccessKey, region })

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
      sizeBytes: table.Table!.TableSizeBytes,
      items: table.Table!.ItemCount,
    })
  }

  return tables
}

const period = 3600

const createDynamoMetric = (tableName, metricName, stats, startTime, endTime) => ({
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


export const getTableMetrics = async (tableName, accessKeyId, secretAccessKey, region) => {
  const cloudwatch = new AWS.CloudWatch({ accessKeyId, secretAccessKey, region })

  const startTime = DateTime.utc().startOf('hour').minus({ days: 30 }).toJSDate()
  const endTime = DateTime.utc().startOf('hour').minus({ hours: 1 }).toJSDate()

  const requests = [
    createDynamoMetric(tableName, 'ConsumedReadCapacityUnits', ['Sum'], startTime, endTime),
    createDynamoMetric(tableName, 'ConsumedWriteCapacityUnits', ['Sum'], startTime, endTime),
    createDynamoMetric(tableName, 'ProvisionedReadCapacityUnits', ['Average'], startTime, endTime),
    createDynamoMetric(tableName, 'ProvisionedWriteCapacityUnits', ['Average'], startTime, endTime),
    createDynamoMetric(tableName, 'ThrottledRequests', ['Sum'], startTime, endTime),
  ]

  return Promise.all(requests.map(request => cloudwatch.getMetricStatistics(request).promise()))
}
