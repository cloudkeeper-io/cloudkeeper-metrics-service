import { chunk, flatten, map, keyBy } from 'lodash'
import * as AWS from 'aws-sdk'
import { LambdaConfiguration, LambdaStats } from '../../entity'
import { getConnection } from '../../db/db'
import { getLambdaMetrics } from '../../utils/lambda.util'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

export const handler = async (tenant) => {
  const connection = await getConnection()

  const lambdas = await connection.getRepository(LambdaConfiguration).find({
    tenantId: tenant.tenantId,
  })

  console.log(`Updating ${lambdas.length} lambdas`)

  const chunks = chunk(lambdas, 10)

  for (const lambdasChunk of chunks) {
    const batchData: any[] = flatten(await Promise.all(map(lambdasChunk, async (lambdaConfig) => {
      const [invocationStats, errorStats, durationStats] = await getLambdaMetrics(
        lambdaConfig.name,
        tenant.accessKey,
        tenant.secretKey,
        tenant.region,
      )

      const errorDataMap = keyBy(errorStats.Datapoints, dataPoint => dataPoint.Timestamp!.getTime())
      const durationDataMap = keyBy(durationStats.Datapoints, dataPoint => dataPoint.Timestamp!.getTime())

      return map(invocationStats.Datapoints!, (datapoint) => {
        // @ts-ignore
        const errorEntry = errorDataMap[datapoint.Timestamp.getTime()]
        // @ts-ignore
        const durationEntry = durationDataMap[datapoint.Timestamp.getTime()]

        return ({
          tenantId: tenant.tenantId,
          lambdaName: lambdaConfig.name,
          dateTime: datapoint.Timestamp!,
          invocations: datapoint.Sum,
          errors: errorEntry.Sum,
          maxDuration: durationEntry.Maximum,
          averageDuration: durationEntry.Average,
        })
      })
    })))

    await connection.createQueryBuilder()
      .insert()
      .into(LambdaStats)
      .values(batchData)
      .orIgnore()
      .execute()
  }

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: tenant.tenantId,
  }).promise()

  return true
}
