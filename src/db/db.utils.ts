import { Connection } from 'typeorm'
import { map } from 'lodash'
import { DateTime } from 'luxon'

export const queryForArray = async (connection: Connection, queryString: string, parameters: any[]) => {
  const results: any[] = []

  while (true) {
    const newResults = await connection.query(queryString + ' limit 500 offset ?', [...parameters, results.length])
    results.push(...newResults)

    if (newResults.length < 500) {
      return results
    }
  }
}

export const mapDataPoints = (dataPoints?: any[], dateFieldName: string = 'dateTime') => map(dataPoints, dataPoint => ({
  ...dataPoint,
  [dateFieldName]: DateTime.fromSQL(dataPoint[dateFieldName], { zone: 'utc' }).toJSDate(),
}))
