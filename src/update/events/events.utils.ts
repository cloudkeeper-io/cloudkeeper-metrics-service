import * as msRestNodeAuth from '@azure/ms-rest-nodeauth'
import { AnomalyDetectorClient, AnomalyDetectorModels } from '@azure/cognitiveservices-anomalydetector'
import { map } from 'lodash'
import { Granularity, Point } from '@azure/cognitiveservices-anomalydetector/lib/models/index'
import { getLambda } from '../../utils/aws.utils'

export interface AnomalyDetectionResult {
  value: number
  isAnomaly: boolean
  timestamp: string
}

export const getAnomalyData = async (series: Point[], granularity: Granularity = 'hourly') => {
  const credentials = await msRestNodeAuth
    .loginWithServicePrincipalSecret(
      process.env.azureClientId!,
      process.env.azureClientSecret!,
      process.env.azureDomain!,
    )

  const client = new AnomalyDetectorClient(credentials, 'https://westeurope.api.cognitive.microsoft.com')

  const body: AnomalyDetectorModels.Request = {
    series,
    granularity,
    customInterval: 1,
    sensitivity: 90,
    period: 1,
  }

  const options = {
    customHeaders: {
      'Ocp-Apim-Subscription-Key': process.env.azureSubscriptionId!,
    },
  }

  const result = await client.entireDetect(body, options)

  return series.map((item, index) => ({
    ...item,
    isAnomaly: result.isAnomaly[index],
    expectedValue: result.expectedValues[index],
  }))
}


export const getAnomalyRrcfData = async (series: Point[]): Promise<AnomalyDetectionResult[]> => {
  if (series.length <= 1) {
    return map(series, point => ({
      isAnomaly: false,
      value: Number(point.value),
      timestamp: point.timestamp.toISOString(),
    }))
  }

  const lambda = getLambda()

  const inputPayload = series.map(point => ({
    ...point,
    value: Number(point.value),
  }))

  const result = await lambda.invoke({
    FunctionName: `${process.env.stage}-anomaly-detector-rrcf-detect`,
    Payload: JSON.stringify(inputPayload),
  }).promise()

  if (result.FunctionError) {
    throw new Error(result.Payload!.toString())
  }

  const responsePayload = JSON.parse(result.Payload!.toString())

  return responsePayload
}
