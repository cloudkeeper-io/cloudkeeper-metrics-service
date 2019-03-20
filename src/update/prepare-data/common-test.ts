import { sumBy } from 'lodash'

export const expectDataToBeConsistent = (lambdas, statName, days, nameField, statType: any = String) => {
  expect(lambdas).toBeTruthy()

  lambdas.forEach((lambda) => {
    expect(lambda).toEqual({
      [nameField]: expect.any(String),
      [statName]: expect.any(statType),
      dataPoints: expect.any(Array),
    })

    if (days > 1) {
      expect(lambda.dataPoints.length).toBeLessThanOrEqual(days)
    } else {
      expect(lambda.dataPoints.length).toBeLessThanOrEqual(24)
    }

    // @ts-ignore
    expect(Number(lambda[statName])).toBeCloseTo(sumBy(lambda.dataPoints, dataPoint => Number(dataPoint[statName])))

    lambda.dataPoints.forEach((dataPoint) => {
      expect(dataPoint).toEqual({
        dateTime: expect.any(Date),
        [statName]: expect.any(statType),
        [nameField]: expect.any(String),
      })
    })
  })
}
