import { chunk, flatten, map, keyBy, groupBy, find } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { LambdaConfiguration, LambdaPrice, LambdaStats } from '../../entity'
import { getConnection } from '../../db/db'
import { getLambdaMetrics } from '../../utils/lambda-metrics.util'
import { getAwsCredentials } from '../../utils/aws.utils'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

const updateLambdasChunk = async (lambdasChunk, credentials, tenant, lambdaPrices, region, connection) => {
  const batchData: any[] = flatten((await Promise.all(map(lambdasChunk, async (lambdaConfig) => {
    const [invocationStats, errorStats, durationStats] = await getLambdaMetrics(
      lambdaConfig.name,
      credentials,
      region,
    )

    const errorDataMap = keyBy(errorStats.Datapoints, dataPoint => dataPoint.Timestamp!.getTime())
    const durationDataMap = keyBy(durationStats.Datapoints, dataPoint => dataPoint.Timestamp!.getTime())

    return map(invocationStats.Datapoints!, (datapoint) => {
      // @ts-ignore
      const errorEntry = errorDataMap[datapoint.Timestamp.getTime()]
      // @ts-ignore
      const durationEntry = durationDataMap[datapoint.Timestamp.getTime()]

      const priceInfo = find(lambdaPrices, { region: lambdaConfig.region })
      const cost = datapoint.Sum ? priceInfo.requestPrice * datapoint.Sum! + datapoint.Sum! * durationEntry.Average! / 1000 * priceInfo.pricePerGbSeconds * lambdaConfig.size / 1024 : 0

      return ({
        tenantId: tenant.id,
        lambdaName: lambdaConfig.name,
        region: lambdaConfig.region,
        dateTime: datapoint.Timestamp!,
        invocations: datapoint.Sum,
        errors: errorEntry.Sum,
        maxDuration: durationEntry.Maximum,
        averageDuration: durationEntry.Average,
        cost,
      })
    })
  }))))

  console.log(batchData)

  await connection.createQueryBuilder()
    .insert()
    .into(LambdaStats)
    .values(batchData)
    .orIgnore()
    .execute()
}

export const handler = async (tenant) => {
  const connection = await getConnection()

  console.log(`Working on tenant ${tenant.id}`)

  const lambdas = await connection.getRepository(LambdaConfiguration).find({
    tenantId: tenant.id,
  })

  const lambdaPrices = await connection.getRepository(LambdaPrice).find()

  console.log(`Updating ${lambdas.length} lambdas`)

  const lambdasMap = groupBy(lambdas, 'region')

  for (const region of Object.keys(lambdasMap)) {
    const regionLambdas = lambdasMap[region]

    console.log(`Tenant ${tenant.id} has ${regionLambdas.length} in ${region}`)

    const chunks = chunk(regionLambdas, 10)

    const credentials = await getAwsCredentials(tenant.id, tenant.roleArn)

    for (const lambdasChunk of chunks) {
      await updateLambdasChunk(lambdasChunk, credentials, tenant, lambdaPrices, region, connection)
    }
  }

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: tenant.id,
  }).promise()

  return true
}
