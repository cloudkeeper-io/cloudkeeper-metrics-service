import * as AWS from 'aws-sdk'
import { map } from 'lodash'
import { DateTime } from 'luxon'
import { LambdaConfiguration } from '../entity'

export const listAllLambdas = async (tenantId, accessKeyId, secretAccessKey, region) => {
  const lambdaClient = new AWS.Lambda({ region, accessKeyId, secretAccessKey })

  const lambdas: LambdaConfiguration[] = []

  let nextMarker: string | undefined

  do {
    const listResult = await lambdaClient.listFunctions({ Marker: nextMarker }).promise()

    const lambdaDatas: LambdaConfiguration[] = map(listResult.Functions, lambdaData => ({
      tenantId,
      name: lambdaData.FunctionName!,
      runtime: lambdaData.Runtime!,
      codeSize: lambdaData.CodeSize!,
      timeout: lambdaData.Timeout!,
      size: lambdaData.MemorySize!,
    }))

    lambdas.push(...lambdaDatas)

    nextMarker = listResult.NextMarker
  } while (nextMarker)

  return lambdas
}

const period = 3600

const createLambdaMetric = (lambdaName, metricName, stat, startTime, endTime) => ({
  StartTime: startTime,
  Namespace: 'AWS/Lambda',
  EndTime: endTime,
  MetricName: metricName,
  Period: period,
  Statistics: [stat],
  Dimensions: [
    {
      Name: 'FunctionName',
      Value: lambdaName,
    },
  ],
})

export const getLambdaMetrics = async (lambdaName) => {
  const cloudwatch = new AWS.CloudWatch({ region: 'eu-west-1' })

  const startTime = DateTime.utc().minus({ days: 30 }).toJSDate()
  const endTime = DateTime.utc().toJSDate()

  const requests = [
    createLambdaMetric(lambdaName, 'Invocations', 'Sum', startTime, endTime),
    createLambdaMetric(lambdaName, 'Errors', 'Sum', startTime, endTime),
    createLambdaMetric(lambdaName, 'Duration', 'Maximum', startTime, endTime),
    createLambdaMetric(lambdaName, 'Duration', 'Average', startTime, endTime),
  ]

  return Promise.all(requests.map(request => cloudwatch.getMetricStatistics(request).promise()))
}
