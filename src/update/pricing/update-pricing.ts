/* eslint-disable max-len */
import * as AWS from 'aws-sdk'
import { filter, find, findKey, includes, keys, flatMap } from 'lodash'
import { getConnection } from '../../db/db'
import { DynamoPerRequestPrice, DynamoProvisionedPrice, LambdaPrice } from '../../entity'

/*
  $$('.lb-dropdown-label li')
  .reduce((acc, current) => { acc[current.innerHTML] = current.dataset.region; return acc; }, {})
  here: https://aws.amazon.com/lambda/pricing/
 */

const regionNames = {
  'US East (N. Virginia)': 'us-east-1',
  'US East (Ohio)': 'us-east-2',
  'US West (N. California)': 'us-west-1',
  'US West (Oregon)': 'us-west-2',
  'Asia Pacific (Hong Kong)': 'ap-east-1',
  'Asia Pacific (Mumbai)': 'ap-south-1',
  'Asia Pacific (Seoul)': 'ap-northeast-2',
  'Asia Pacific (Singapore)': 'ap-southeast-1',
  'Asia Pacific (Sydney)': 'ap-southeast-2',
  'Asia Pacific (Tokyo)': 'ap-northeast-1',
  'Canada (Central)': 'ca-central-1',
  'EU (Frankfurt)': 'eu-central-1',
  'EU (Ireland)': 'eu-west-1',
  'EU (London)': 'eu-west-2',
  'EU (Paris)': 'eu-west-3',
  'EU (Stockholm)': 'eu-north-1',
  'Middle East (Bahrain)': 'me-south-1',
  'South America (Sao Paulo)': 'sa-east-1',
  'AWS GovCloud (US-East)': 'us-gov-east-1',
  'AWS GovCloud (US)': 'us-gov-west-1',
}

const getPricingData = async (pricing, serviceCode: string, filterDefinition) => {
  const mappedFilters: any = keys(filterDefinition).map(key => ({
    Type: 'TERM_MATCH',
    Field: key,
    Value: filterDefinition[key],
  }))

  const durationProductsResponse = await pricing.getProducts({
    ServiceCode: serviceCode,
    Filters: mappedFilters,
  }).promise()

  const ignoredLocations = ['Asia Pacific (Osaka-Local)', 'Any']

  // @ts-ignore

  console.log(JSON.stringify(durationProductsResponse.PriceList))

  const products = filter(durationProductsResponse.PriceList, productData => !includes(ignoredLocations, productData.product.attributes.location))

  return products.map((productData: any) => {
    const termsKey = findKey(productData.terms.OnDemand)!
    const priceDimensions = productData.terms.OnDemand[termsKey].priceDimensions
    const priceDimension = find(priceDimensions, (dimension) => {
      const pricePerUnit = dimension.pricePerUnit.USD
      return pricePerUnit && pricePerUnit !== '0.0000000000'
    })

    const region = regionNames[productData.product.attributes.location]

    if (!region) {
      throw new Error(`Unknown region ${productData.product.attributes.location}`)
    }

    return {
      region,
      pricePerUnit: priceDimension.pricePerUnit.USD,
    }
  })
}

const createReplaceQuery = (connection, entity, data) => connection.createQueryBuilder()
  .insert()
  .into(entity)
  .values(data)
  .orIgnore()
  .getQuery()
  .replace('INSERT INTO', 'REPLACE INTO')

export const handler = async () => {
  const connection = await getConnection()

  const pricing = new AWS.Pricing({ region: 'us-east-1' })

  const lambdaGbPerSecondData = await getPricingData(pricing, 'AWSLambda', { group: 'AWS-Lambda-Duration' })
  const lambdaRequestsData = await getPricingData(pricing, 'AWSLambda', { group: 'AWS-Lambda-Requests' })

  const pricingData = lambdaGbPerSecondData.map(data => ({
    region: data.region,
    pricePerGbSeconds: data.pricePerUnit,
    requestPrice: find(lambdaRequestsData, { region: data.region })!.pricePerUnit,
  }))

  const replaceLambdasQuery = createReplaceQuery(connection, LambdaPrice, pricingData)

  const lambdaPriceParams = flatMap(pricingData, data => [
    data.region,
    data.pricePerGbSeconds,
    data.requestPrice,
  ])

  await connection.query(replaceLambdasQuery, lambdaPriceParams)

  const pppWriteData = await getPricingData(pricing, 'AmazonDynamoDB', { groupName: 'DDB-WriteUnits', groupDescription: 'DynamoDB PayPerRequest Write Request Units' })
  const pppReadData = await getPricingData(pricing, 'AmazonDynamoDB', { groupName: 'DDB-ReadUnits', groupDescription: 'DynamoDB PayPerRequest Read Request Units' })

  const payPerRequestPricingData = pppWriteData.map(data => ({
    region: data.region,
    write: data.pricePerUnit,
    read: find(pppReadData, { region: data.region })!.pricePerUnit,
  }))

  const replacePayPerRequestQuery = createReplaceQuery(connection, DynamoPerRequestPrice, payPerRequestPricingData)

  const pppPriceParams = flatMap(payPerRequestPricingData, data => [
    data.region,
    data.read,
    data.write,
  ])

  await connection.query(replacePayPerRequestQuery, pppPriceParams)

  const provisionedWriteData = await getPricingData(pricing, 'AmazonDynamoDB', { groupName: 'DDB-WriteUnits', groupDescription: 'DynamoDB Provisioned Write Units' })
  const provisionedReadData = await getPricingData(pricing, 'AmazonDynamoDB', { groupName: 'DDB-ReadUnits', groupDescription: 'DynamoDB Provisioned Read Units' })

  const provisionedPricingData = provisionedWriteData.map(data => ({
    region: data.region,
    write: data.pricePerUnit,
    read: find(provisionedReadData, { region: data.region })!.pricePerUnit,
  }))

  const replaceProvisionedQuery = createReplaceQuery(connection, DynamoProvisionedPrice, provisionedPricingData)

  const provisionedPriceParams = flatMap(provisionedPricingData, data => [
    data.region,
    data.read,
    data.write,
  ])

  await connection.query(replaceProvisionedQuery, provisionedPriceParams)

  const storageData = await getPricingData(pricing, 'AmazonDynamoDB', { volumeType: 'Amazon DynamoDB - Indexed DataStore' })

  const storagePricingData = storageData.map(data => ({
    region: data.region,
    gbPerMonthPrice: data.pricePerUnit,
  }))

  const replaceStorageQuery = createReplaceQuery(connection, DynamoProvisionedPrice, provisionedPricingData)

  const storagePriceParams = flatMap(storagePricingData, data => [
    data.region,
    data.gbPerMonthPrice,
  ])

  await connection.query(replaceStorageQuery, storagePriceParams)
}
