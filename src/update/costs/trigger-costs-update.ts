// eslint-disable-next-line import/no-extraneous-dependencies
import * as Lambda from 'aws-sdk/clients/lambda'
import { map, filter } from 'lodash'
import { scanForArray } from '../../utils/dynamodb'

const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async () => {
  const tenants = await scanForArray({
    TableName: `${process.env.stage}-cloudkeeper-tenants`,
  })

  const setupTenants = filter(tenants, { isSetupCompleted: true })

  console.log(`Updating ${setupTenants.length} tenants`)

  await Promise.all(
    map(setupTenants, tenant => lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-costs-for-tenant`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(tenant),
    }).promise()),
  )

  return true
}
