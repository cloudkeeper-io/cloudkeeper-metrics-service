import { sumBy } from 'lodash'

export const expectDataToBeConsistent = (lambdas, statNames, days, nameField, statType: any = String) => {
  expect(lambdas).toBeTruthy()

  lambdas.forEach((lambda) => {
    statNames.forEach((statName) => {
      expect(lambda[statName]).toEqual(expect.any(statType))
    })

    expect(lambda[nameField]).toEqual(expect.any(String))
    expect(lambda.dataPoints).toEqual(expect.any(Array))

    if (days > 1) {
      expect(lambda.dataPoints.length).toBe(days)
    } else {
      expect(lambda.dataPoints.length).toBe(24)
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
