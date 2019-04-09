import { chunk, flatten, map, keyBy, uniq, get, groupBy } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DynamoTable, DynamoTableStats } from '../../entity'
import { getConnection } from '../../db/db'
import { getTableMetrics } from '../../utils/dynamodb.util'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

async function updateTablesChunk(tablesChunks, tenant, region, connection) {
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

      return ({
        tenantId: tenant.id,
        name: table.name,
        region,
        dateTime: timePoint,
        consumedRead: get(consumedReadData, 'Sum', 0),
        consumedWrite: get(consumedWriteData, 'Sum', 0),
        provisionedRead: get(provisionedReadData, 'Average', 0),
        provisionedWrite: get(provisionedWriteData, 'Average', 0),
        throttledReads: get(readThrottleData, 'Sum', 0),
        throttledWrites: get(writeThrottleData, 'Sum', 0),
      })
    })
  })))

  await connection.createQueryBuilder()
    .insert()
    .into(DynamoTableStats)
    .values(batchData)
    .orIgnore()
    .execute()
}

export const handler = async (tenant) => {
  const connection = await getConnection()

  console.log(`Working on tenant ${tenant.id}`)

  const tables = await connection.getRepository(DynamoTable).find({
    tenantId: tenant.id,
  })

  console.log(`Updating ${tables.length} tables`)

  const tablesMap = groupBy(tables, 'region')

  const chunks = chunk(tables, 10)

  for (const region of Object.keys(tablesMap)) {
    for (const tablesChunks of chunks) {
      await updateTablesChunk(tablesChunks, tenant, region, connection)
    }
  }

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: JSON.stringify(tenant),
  }).promise()

  return true
}
