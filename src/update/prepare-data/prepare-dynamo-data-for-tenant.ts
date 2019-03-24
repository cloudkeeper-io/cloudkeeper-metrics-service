// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import {
  getMostExpensiveTables,
  getMostReadTables,
  getMostThrottledTables,
  getMostWritesTables,
} from './dynamo-data-collectors'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const handler = async (event) => {
  await Promise.all(event.Records.map(async (record) => {
    const tenant = JSON.parse(record.Sns.Message)

    const { id, region } = tenant

    console.log(`Preparing data for tenant ${id}`)

    const mostReadTables = await getMostReadTables(id, 1)

    const mostWritesTables = await getMostWritesTables(id, 1)

    const mostThrottledTables = await getMostThrottledTables(id, 1)

    const mostExpensiveTables = await getMostExpensiveTables(id, region, 1)

    const last30DaysMostReadTables = await getMostReadTables(id, 30, true)

    const last30DaysMostWritesTables = await getMostWritesTables(id, 30, true)

    const last30DaysMostThrottledTables = await getMostThrottledTables(id, 30, true)

    const last30DaysMostExpensiveTables = await getMostExpensiveTables(id, region, 30, true)

    const data = {
      last24Hours: {
        mostReadTables,
        mostWritesTables,
        mostThrottledTables,
        mostExpensiveTables,
      },
      last30Days: {
        mostReadTables: last30DaysMostReadTables,
        mostWritesTables: last30DaysMostWritesTables,
        mostThrottledTables: last30DaysMostThrottledTables,
        mostExpensiveTables: last30DaysMostExpensiveTables,
      },
    }

    await s3.putObject({
      Bucket: process.env.bucket!,
      Key: `dashboard/data/dynamo/${id}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }).promise()
  }))

  return true
}
