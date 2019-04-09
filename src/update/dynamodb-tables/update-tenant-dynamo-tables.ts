import * as Lambda from 'aws-sdk/clients/lambda'
import { flatMap } from 'lodash'

import { getConnection } from '../../db/db'
import { listTables } from '../../utils/dynamodb.util'
import { DynamoTable } from '../../entity'
import { getAwsRegions } from '../../utils/aws.utils'

const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.id}`)
  console.log(tenant)
  const connection = await getConnection()

  console.log('Connected to db')

  const regions = await getAwsRegions()

  for (const region of regions) {
    const tables = await listTables(tenant.id, tenant.roleArn, region)

    console.log(`Tenant has ${tables.length} tables in ${region}`)

    const query = connection.createQueryBuilder()
      .insert()
      .into(DynamoTable)
      .values(tables)
      .getQuery()
      .replace('INSERT INTO', 'REPLACE INTO')

    const params = flatMap(tables, table => [
      table.tenantId,
      table.name,
      region,
      table.billingMode,
      table.sizeBytes,
      table.items,
    ])

    await connection.query(query, params)
  }

  console.log('Finished updating dynamo tables')

  await lambda.invoke({
    FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-dynamo-stats`,
    InvocationType: 'Event',
    LogType: 'None',
    Payload: JSON.stringify(tenant),
  }).promise()
}
