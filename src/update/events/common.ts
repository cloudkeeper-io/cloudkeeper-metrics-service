import * as AWS from 'aws-sdk'
import { round } from 'lodash'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const writeLatestEventsToS3 = async (connection, tenantId) => {
  const lastEvents = await connection.query(
    'select * from Event where tenantId = ? order by `dateTime` desc LIMIT 20',
    [tenantId],
  )

  const events = {
    events: lastEvents,
  }

  await s3.putObject({
    Bucket: process.env.bucket!,
    Key: `dashboard/data/events/${tenantId}.json`,
    Body: JSON.stringify(events),
    ContentType: 'application/json',
  }).promise()
}

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
