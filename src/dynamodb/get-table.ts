import { getConnection } from '../db/db'
import { DynamoTable } from '../entity'

export const handler = async (request) => {
  const { name, region, tenantId } = request

  const connection = await getConnection()

  const repository = connection.getRepository(DynamoTable)

  return repository.findOne({ tenantId, name, region })
}
