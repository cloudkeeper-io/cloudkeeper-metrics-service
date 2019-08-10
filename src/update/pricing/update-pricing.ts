import * as AWS from 'aws-sdk'
import { filter, findKey } from 'lodash'

/*
$$('.lb-dropdown-label li').reduce((acc, current) => { acc[current.innerHTML] = current.dataset.region; return acc; }, {})
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

export const handler = async () => {
  const pricing = new AWS.Pricing({ region: 'us-east-1' })

  const productsResponse = await pricing.getProducts({
    ServiceCode: 'AWSLambda',
    Filters: [{
      Type: 'TERM_MATCH',
      Field: 'group',
      Value: 'AWS-Lambda-Duration',
    }],
  }).promise()

  // @ts-ignore
  const products = filter(productsResponse.PriceList, productData => productData.product.attributes.location !== 'Any')

  const lambdaGbPerSecond = products.map((productData:any) => {
    const termsKey = findKey(productData.terms.OnDemand)!
    const priceDimensions = productData.terms.OnDemand[termsKey].priceDimensions
    const priceDimensionsKey = findKey(priceDimensions)!

    const region = regionNames[productData.product.attributes.location]

    if (!region) {
      throw new Error(`Unknown region ${productData.product.attributes.location}`)
    }

    return {
      region,
      pricePerUnit: priceDimensions[priceDimensionsKey].pricePerUnit.USD
    }
  })

  console.log(lambdaGbPerSecond)
}

handler()
