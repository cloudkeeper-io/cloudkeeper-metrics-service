import * as AWS from 'aws-sdk'
import { map, find, get } from 'lodash'
import { DateTime } from 'luxon'
import { getLambdaMetrics, listAllLambdas } from './utils/lambda.util'

export const handler = async () => {
  const lambdas = await listAllLambdas('test', 'AKIAJI7Y7EUA4WTJYTUA', '18nkxX9dEwFzUZ0VNoiEva4KA7QbzXd3FwRo955F', 'eu-west-1')

  // const metrics = await getLambdaMetrics('company-service-dev-get-leads-feed')
  console.log(lambdas)
}
