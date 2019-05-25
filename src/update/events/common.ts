import * as AWS from 'aws-sdk'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const writeLatestEventsToS3 = async (connection, tenantId) => {
  const lastEvents = await connection.query(
    'select * from Event where tenantId = ? order by `dateTime` desc LIMIT 20',
    [tenantId],
  )

  await s3.putObject({
    Bucket: process.env.bucket!,
    Key: `dashboard/data/events/${tenantId}.json`,
    Body: JSON.stringify(lastEvents),
    ContentType: 'application/json',
  }).promise()
}

export const generateMessage = (dimensionName, value, expectedValue, unitPrefix = '', unitPostFix = '') => {
  let digitPart
  let change
  if (value > expectedValue) {
    if (expectedValue) {
      const percentage = (value - expectedValue) / expectedValue

      if (percentage > 10) {
        digitPart = percentage + '%'
      } else {
        digitPart = unitPrefix + Math.round(value - expectedValue) + unitPostFix
      }
    } else {
      digitPart = unitPrefix + Math.round(value - expectedValue) + unitPostFix
    }
    change = 'higher'
  } else {
    if (expectedValue) {
      const percentage = (expectedValue - value) / expectedValue

      if (percentage > 10) {
        digitPart = percentage + '%'
      } else {
        digitPart = unitPrefix + Math.round(expectedValue - value) + unitPostFix
      }
    } else {
      digitPart = unitPrefix + Math.round(expectedValue - value) + unitPostFix
    }
    change = 'lower'
  }

  return `${dimensionName} is ${change} than expected by ${digitPart}`
}
