import { flatMap } from 'lodash'
import { getConnection } from '../../db/db'
import { listTables } from '../../utils/dynamodb.util'
import { DynamoTable } from '../../entity'

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.id}`)
  console.log(tenant)
  const connection = await getConnection()

  console.log('Connected to db')

  const tables = await listTables(tenant.id, tenant.accessKey, tenant.secretKey, tenant.region)

  console.log(`Tenant has ${tables.length} tables`)

  const query = connection.createQueryBuilder()
    .insert()
    .into(DynamoTable)
    .values(tables)
    .getQuery()
    .replace('INSERT INTO', 'REPLACE INTO')

  const params = flatMap(tables, table => [
    table.tenantId,
    table.name,
    table.billingMode,
    table.sizeBytes,
    table.items,
  ])

  await connection.query(query, params)

  console.log('Finished updating lambdas')
}
