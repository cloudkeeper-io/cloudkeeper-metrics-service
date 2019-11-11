import { DateTime } from 'luxon'
import { chunk } from 'lodash'
import * as AWS from 'aws-sdk'
import { CostData } from '../../entity'
import { getConnection } from '../../db/db'
import { getCostsData } from '../../utils/costs.util'

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.id}`)
  const connection = await getConnection()

  const start = DateTime
    .utc()
    .startOf('second')
    .minus({ days: 91 })
    .toISODate()

  const end = DateTime
    .utc()
    .startOf('second')
    .toISODate()

  const items = await getCostsData(tenant.id, tenant.roleArn, start, end)

  const parts: any[] = chunk(items, 100)

  for (const part of parts) {
    await connection.createQueryBuilder()
      .insert()
      .into(CostData)
      .values(part)
      .orIgnore()
      .execute()
  }

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: JSON.stringify(tenant),
  }).promise()
}
