import * as msRestNodeAuth from '@azure/ms-rest-nodeauth'
import { AnomalyDetectorClient, AnomalyDetectorModels } from '@azure/cognitiveservices-anomalydetector'
import { Granularity } from '@azure/cognitiveservices-anomalydetector/lib/models/index'

export const getAnomalyData = async (series, granularity: Granularity = 'hourly') => {
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
