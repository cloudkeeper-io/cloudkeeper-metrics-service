import { chunk, flatten, map, keyBy, uniq, get, groupBy, find } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'
import {
  DynamoPerRequestPrice,
  DynamoProvisionedPrice,
  DynamoStoragePrice,
  DynamoTable,
  DynamoTableStats,
} from '../../entity'
import { getConnection } from '../../db/db'
import { getTableMetrics } from '../../utils/dynamodb-metrics.util'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

async function updateTablesChunk(tablesChunks, tenant, region, costRateData, connection) {
  const batchData: any[] = flatten(await Promise.all(map(tablesChunks, async (table) => {
    const [
      consumedReadStats,
      consumedWriteStats,
      provisionedReadStats,
      provisionedWriteStats,
      readThrottleStats,
      writeThrottleStats,
    ] = await getTableMetrics(
      table.name,
      tenant.id,
      tenant.roleArn,
      region,
    )

    const dataPointToTime = dataPoint => dataPoint.Timestamp!.getTime()
    const dataPointToTimestamp = dataPoint => dataPoint.Timestamp

    const consumedReadMap = keyBy(consumedReadStats.Datapoints, dataPointToTime)
    const consumedWriteMap = keyBy(consumedWriteStats.Datapoints, dataPointToTime)
    const provisionedReadMap = keyBy(provisionedReadStats.Datapoints, dataPointToTime)
    const provisionedWriteMap = keyBy(provisionedWriteStats.Datapoints, dataPointToTime)
    const readThrottleMap = keyBy(readThrottleStats.Datapoints, dataPointToTime)
    const writeThrottleMap = keyBy(writeThrottleStats.Datapoints, dataPointToTime)

    const timePoints = uniq([
      ...map(consumedReadStats.Datapoints, dataPointToTimestamp),
      ...map(consumedWriteStats.Datapoints, dataPointToTimestamp),
      ...map(provisionedReadStats.Datapoints, dataPointToTimestamp),
      ...map(provisionedWriteStats.Datapoints, dataPointToTimestamp),
      ...map(readThrottleStats.Datapoints, dataPointToTimestamp),
      ...map(writeThrottleStats.Datapoints, dataPointToTimestamp),
    ])

    return map(timePoints, (timePoint) => {
      // @ts-ignore
      const consumedReadData = consumedReadMap[timePoint.getTime()]
      // @ts-ignore
      const consumedWriteData = consumedWriteMap[timePoint.getTime()]
      // @ts-ignore
      const provisionedReadData = provisionedReadMap[timePoint.getTime()]
      // @ts-ignore
      const provisionedWriteData = provisionedWriteMap[timePoint.getTime()]
      // @ts-ignore
      const readThrottleData = readThrottleMap[timePoint.getTime()]
      // @ts-ignore
      const writeThrottleData = writeThrottleMap[timePoint.getTime()]

      const consumedRead = get(consumedReadData, 'Sum', 0)
      const consumedWrite = get(consumedWriteData, 'Sum', 0)
      const provisionedRead = get(provisionedReadData, 'Average', 0)
      const provisionedWrite = get(provisionedWriteData, 'Average', 0)

      const fractionOfMonth = 1 / (DateTime.fromMillis(timePoint.getTime()).daysInMonth * 24)
      const storageCost = table.sizeBytes / (1024 * 1024 * 1024)
        * fractionOfMonth
        * find<DynamoStoragePrice>(costRateData.storageCostData, { region: table.region })!.gbPerMonthPrice

      let readCost = 0
      let writeCost = 0

      if (table.billingMode === 'PROVISIONED') {
        const operationsCostData = find<DynamoProvisionedPrice>(costRateData.provisionedCostData, {
          region: table.region,
        })!

        readCost = provisionedRead * operationsCostData.read
        writeCost = provisionedWrite * operationsCostData.write
      } else {
        const operationsCostData = find<DynamoPerRequestPrice>(costRateData.payPerRequestCostData, {
          region: table.region,
        })!

        readCost = consumedRead / 1000000 * operationsCostData.read
        writeCost = consumedWrite / 1000000 * operationsCostData.write
      }

      return ({
        tenantId: tenant.id,
        name: table.name,
        region,
        dateTime: timePoint,
        consumedRead,
        consumedWrite,
        provisionedRead,
        provisionedWrite,
        throttledReads: get(readThrottleData, 'Sum', 0),
        throttledWrites: get(writeThrottleData, 'Sum', 0),
        storageCost,
        readCost,
        writeCost,
        cost: storageCost + writeCost + readCost,
      })
    })
  })))

  const parts: any[] = chunk(batchData, 100)

  for (const part of parts) {
    await connection.createQueryBuilder()
      .insert()
      .into(DynamoTableStats)
      .values(part)
      .orIgnore()
      .execute()
  }
}

export const handler = async (tenant) => {
  const connection = await getConnection()

  console.log(`Working on tenant ${tenant.id}`)

  const payPerRequestCostData = await connection.getRepository(DynamoPerRequestPrice).find()
  const provisionedCostData = await connection.getRepository(DynamoProvisionedPrice).find()
  const storageCostData: DynamoStoragePrice[] = await connection.getRepository(DynamoStoragePrice).find()

  const costRateData = {
    payPerRequestCostData,
    provisionedCostData,
    storageCostData,
  }

  const tables = await connection.getRepository(DynamoTable).find({
    tenantId: tenant.id,
  })

  console.log(`Updating ${tables.length} tables`)

  const tablesMap = groupBy(tables, 'region')

  const chunks = chunk(tables, 5)

  for (const region of Object.keys(tablesMap)) {
    for (const tablesChunks of chunks) {
      await updateTablesChunk(tablesChunks, tenant, region, costRateData, connection)
    }
  }

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: JSON.stringify(tenant),
  }).promise()

  return true
}
