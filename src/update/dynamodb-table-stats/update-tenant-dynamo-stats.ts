import { chunk, flatten, map, keyBy, uniq, get } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DynamoTable, DynamoTableStats } from '../../entity'
import { getConnection } from '../../db/db'
import { getTableMetrics } from '../../utils/dynamodb.util'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

export const handler = async (tenant) => {
  const connection = await getConnection()

  const tables = await connection.getRepository(DynamoTable).find({
    tenantId: tenant.id,
  })

  console.log(`Updating ${tables.length} tables`)

  const chunks = chunk(tables, 10)

  for (const tablesChunks of chunks) {
    const batchData: any[] = flatten(await Promise.all(map(tablesChunks, async (table) => {
      const [
        consumedReadStats,
        consumedWriteStats,
        provisionedReadStats,
        provisionedWriteStats,
        throttledStats,
      ] = await getTableMetrics(
        table.name,
        tenant.accessKey,
        tenant.secretKey,
        tenant.region,
      )

      const dataPointToTime = dataPoint => dataPoint.Timestamp!.getTime()
      const dataPointToTimestamp = dataPoint => dataPoint.Timestamp

      const consumedReadMap = keyBy(consumedReadStats.Datapoints, dataPointToTime)
      const consumedWriteMap = keyBy(consumedWriteStats.Datapoints, dataPointToTime)
      const provisionedReadMap = keyBy(provisionedReadStats.Datapoints, dataPointToTime)
      const provisionedWriteMap = keyBy(provisionedWriteStats.Datapoints, dataPointToTime)
      const throttledMap = keyBy(throttledStats.Datapoints, dataPointToTime)

      console.log(throttledMap)

      const timePoints = uniq([
        ...map(consumedReadStats.Datapoints, dataPointToTimestamp),
        ...map(consumedWriteStats.Datapoints, dataPointToTimestamp),
        ...map(provisionedReadStats.Datapoints, dataPointToTimestamp),
        ...map(provisionedWriteStats.Datapoints, dataPointToTimestamp),
        ...map(throttledStats.Datapoints, dataPointToTimestamp),
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
        const throttledData = throttledMap[timePoint.getTime()]

        return ({
          tenantId: tenant.id,
          name: table.name,
          dateTime: timePoint,
          consumedRead: get(consumedReadData, 'Sum', 0),
          consumedWrite: get(consumedWriteData, 'Sum', 0),
          provisionedRead: get(provisionedReadData, 'Average', 0),
          provisionedWrite: get(provisionedWriteData, 'Average', 0),
          throttledRequests: get(throttledData, 'Sum', 0),
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

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: tenant.id,
  }).promise()

  return true
}
