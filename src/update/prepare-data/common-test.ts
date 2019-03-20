import { sumBy } from 'lodash'

export const expectDataToBeConsistent = (lambdas, statNames, days, nameField, statType: any = String) => {
  expect(lambdas).toBeTruthy()

  lambdas.forEach((lambda) => {
    const expectedTopLevel = {
      [nameField]: expect.any(String),
      dataPoints: expect.any(Array),
    }

    statNames.forEach((statName) => {
      expectedTopLevel[statName] = expect.any(statType)
    })

    expect(lambda).toEqual(expectedTopLevel)

    if (days > 1) {
      expect(lambda.dataPoints.length).toBeLessThanOrEqual(days)
    } else {
      expect(lambda.dataPoints.length).toBeLessThanOrEqual(24)
    }

    // @ts-ignore
    statNames.forEach((statName) => {
      expect(Number(lambda[statName])).toBeCloseTo(sumBy(lambda.dataPoints, dataPoint => Number(dataPoint[statName])))
    })

    lambda.dataPoints.forEach((dataPoint) => {
      const expectedDataPoint = {
        [nameField]: expect.any(String),
        dateTime: expect.any(Date),
      }

      statNames.forEach((statName) => {
        expectedDataPoint[statName] = expect.any(statType)
      })
      expect(dataPoint).toEqual(expectedDataPoint)
    })
  })
}
