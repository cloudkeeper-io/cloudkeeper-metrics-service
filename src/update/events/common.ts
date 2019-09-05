import { round } from 'lodash'

export const generateMessage = (dimensionName, value, expectedValue, unitPrefix = '', unitPostFix = '') => {
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

  return `${dimensionName} is ${change} than expected by ${digitPart}`
}

export const generateMessageWithAverage = (dimensionName, value, average, formatValue = x => x) => {
  let digitPart
  let change
  if (value > average) {
    if (average) {
      const percentage = round((value - average) / average * 100)

      if (percentage > 10) {
        digitPart = percentage + '%'
      } else {
        digitPart = formatValue(round(value - average, 2))
      }
    } else {
      digitPart = formatValue(round(value - average, 2))
    }
    change = 'higher'
  } else {
    if (average) {
      const percentage = round((average - value) / average * 100)

      if (percentage > 10) {
        digitPart = percentage + '%'
      } else {
        digitPart = formatValue(round(average - value, 2))
      }
    } else {
      digitPart = formatValue(round(average - value, 2))
    }
    change = 'lower'
  }

  return `${dimensionName} is ${change} than average by ${digitPart} (${formatValue(round(value))})`
}

export const setProcessingIsDone = async (tenantId, dynamo) => {
  try {
    await dynamo.update({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Key: {
        id: tenantId,
      },
      UpdateExpression: 'SET initialProcessing.done = :true',
      ConditionExpression: `initialProcessing.costs = :true and 
          initialProcessing.lambda = :true and 
          initialProcessing.dynamo = :true`,
      ExpressionAttributeValues: {
        ':true': true,
      },
    }).promise()
  } catch (e) {
    console.log(e)
  }
}
