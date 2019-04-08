import { chunk, flatten, map, keyBy } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { LambdaConfiguration, LambdaStats } from '../../entity'
import { getConnection } from '../../db/db'
import { getLambdaMetrics } from '../../utils/lambda.util'
import { getAwsCredentials } from '../../utils/aws.utils'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

export const handler = async (tenant) => {
  const connection = await getConnection()

  console.log(`Working on tenant ${tenant.id}`)

  const lambdas = await connection.getRepository(LambdaConfiguration).find({
    tenantId: tenant.id,
  })

  console.log(`Updating ${lambdas.length} lambdas`)

  const chunks = chunk(lambdas, 10)

  const credentials = await getAwsCredentials(tenant.id, tenant.roleArn)

  for (const lambdasChunk of chunks) {
    const batchData: any[] = flatten(await Promise.all(map(lambdasChunk, async (lambdaConfig) => {
      const [invocationStats, errorStats, durationStats] = await getLambdaMetrics(
        lambdaConfig.name,
        credentials,
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
          tenantId: tenant.id,
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
    Message: tenant.id,
  }).promise()

  return true
}
