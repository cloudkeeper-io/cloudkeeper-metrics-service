import { DateTime } from 'luxon'
import { flatMap } from 'lodash'
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
    .minus({ days: 90 })
    .toISODate()

  const end = DateTime
    .utc()
    .startOf('second')
    .toISODate()

  const items = await getCostsData(tenant.id, tenant.roleArn, start, end)

  const query = connection.createQueryBuilder()
    .insert()
    .into(CostData)
    // @ts-ignore
    .values(items)
    .getQuery()
    .replace('INSERT INTO', 'REPLACE INTO')

  const params = flatMap(items, item => [
    item.tenantId,
    item.serviceName,
    item.stackName,
    item.date,
    item.blendedCost,
  ])

  await connection.query(query, params)

  await sns.publish({
    TopicArn: process.env.finishedTopic,
    Message: tenant.id,
  }).promise()
}
