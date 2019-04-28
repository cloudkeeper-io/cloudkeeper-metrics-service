/* eslint-disable import/no-extraneous-dependencies */
import { ScanInput } from 'aws-sdk/clients/dynamodb'
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client'

import { getDynamo } from './aws.utils'

import AttributeMap = DocumentClient.AttributeMap
import QueryInput = DocumentClient.QueryInput

export const scanForArray = async (params: ScanInput) => {
  const dynamoDb = await getDynamo()
  const scanParams = {
    ...params,
  }

  const results: AttributeMap[] = []

  while (true) {
    const scanResults = await dynamoDb.scan(scanParams).promise()

    if (!scanResults.Items) {
      return results
    }

    results.push(...scanResults.Items)

    if (typeof scanResults.LastEvaluatedKey === 'undefined') {
      return results
    }

    scanParams.ExclusiveStartKey = scanResults.LastEvaluatedKey
  }
}

export const queryForArray = async (params: QueryInput) => {
  const dynamoDb = await getDynamo()

  const queryParams = {
    ...params,
  }

  const results: AttributeMap[] = []

  while (true) {
    const queryResults = await dynamoDb.query(queryParams).promise()

    if (!queryResults.Items) {
      return results
    }

    results.push(...queryResults.Items)

    if (typeof queryResults.LastEvaluatedKey === 'undefined') {
      return results
    }

    queryParams.ExclusiveStartKey = queryResults.LastEvaluatedKey
  }
}
