// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { map } from 'lodash'
import { DateTime } from 'luxon'
import { LambdaConfiguration } from '../entity'

export const listAllLambdas = async (tenantId, accessKeyId, secretAccessKey, region) => {
  const lambdaClient = new AWS.Lambda({ accessKeyId, secretAccessKey, region })

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

export const createLambdaMetric = (lambdaName, metricName, stats, startTime, endTime) => ({
  StartTime: startTime,
  Namespace: 'AWS/Lambda',
  EndTime: endTime,
  MetricName: metricName,
  Period: period,
  Statistics: stats,
  Dimensions: [
    {
      Name: 'FunctionName',
      Value: lambdaName,
    },
  ],
})

export const getLambdaMetrics = async (lambdaName, accessKeyId, secretAccessKey, region) => {
  const cloudwatch = new AWS.CloudWatch({ accessKeyId, secretAccessKey, region })

  const startTime = DateTime.utc().startOf('hour').minus({ days: 30 }).toJSDate()
  const endTime = DateTime.utc().startOf('hour').toJSDate()

  const requests = [
    createLambdaMetric(lambdaName, 'Invocations', ['Sum'], startTime, endTime),
    createLambdaMetric(lambdaName, 'Errors', ['Sum'], startTime, endTime),
    createLambdaMetric(lambdaName, 'Duration', ['Maximum', 'Average'], startTime, endTime),
  ]

  return Promise.all(requests.map(request => cloudwatch.getMetricStatistics(request).promise()))
}

export const checkAccess = async (accessKeyId, secretAccessKey, region) => {
  const lambdaClient = new AWS.Lambda({ accessKeyId, secretAccessKey, region })

  const listResult = await lambdaClient.listFunctions().promise()

  if (!listResult.Functions) {
    return {
      functions: 0,
    }
  }

  await getLambdaMetrics(listResult.Functions[0].FunctionName, accessKeyId, secretAccessKey, region)

  return {
    functions: listResult.Functions.length,
  }
}
