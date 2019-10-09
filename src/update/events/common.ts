import { filter, round, takeRight } from 'lodash'
import { Point } from '@azure/cognitiveservices-anomalydetector/lib/models/index'
import { AnomalyDetectionResult, getAnomalyRrcfData } from './events.utils'

export const generateMessageWithExpected = (dimensionName, value, expectedValue, unitPrefix = '', unitPostFix = '') => {
  let digitPart
  let change
  if (value > expectedValue) {
    if (expectedValue) {
      const percentage = round((value - expectedValue) / expectedValue * 100)

      if (percentage > 10) {
        digitPart = percentage + '%'
      } else {
        digitPart = unitPrefix + round(value - expectedValue) + unitPostFix
      }
    } else {
      digitPart = unitPrefix + round(value - expectedValue) + unitPostFix
    }
    change = 'higher'
  } else {
    if (expectedValue) {
      const percentage = round((expectedValue - value) / expectedValue * 100)

      if (percentage > 10) {
        digitPart = percentage + '%'
      } else {
        digitPart = unitPrefix + round(expectedValue - value) + unitPostFix
      }
    } else {
      digitPart = unitPrefix + round(expectedValue - value) + unitPostFix
    }
    change = 'lower'
  }

  return `${dimensionName} is ${unitPrefix + round(value, 2) + unitPostFix}, ${change} than expected by ${digitPart}`
}

export const generateMessage = (dimensionName, value, average: number | undefined, formatValue = x => x) => {
  let digitPart
  let change

  let averagePart

  if (average !== undefined) {
    if (value > average) {
      change = 'higher'
    } else {
      change = 'lower'
    }

    digitPart = formatValue(Math.abs(round(value - average, 2)))

    averagePart = `, ${change} than average by ${digitPart}`
  }

  return `${dimensionName} is ${formatValue(round(value))}${averagePart || ''}`
}

export const setProcessingIsDone = async (tenantId, dynamo) => {
  try {
    await dynamo.update({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Key: {
        id: tenantId,
      },
      UpdateExpression: 'SET initialProcessing.done = :true',
      ConditionExpression: `initialProcessing.lambda = :true and 
          initialProcessing.dynamo = :true`,
      ExpressionAttributeValues: {
        ':true': true,
      },
    }).promise()
  } catch (e) {
    console.log(e)
  }
}

type AnomalyFilterFunction = (dataPoint: AnomalyDetectionResult) => boolean

export const findAnomaliesInTimeSeries = async (timeSeries: Point[], additionalFilter: AnomalyFilterFunction = () => true) => {
  const anomalyDetectionResults = await getAnomalyRrcfData(timeSeries)

  return filter(takeRight(anomalyDetectionResults, 10),
    dataPoint => dataPoint.isAnomaly
      && dataPoint.value !== 0
      && additionalFilter(dataPoint))
}
