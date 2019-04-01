import { fillEmptyDataPoints } from './common'

describe('test common functions', () => {
    test('fillEmptyDataPoints', async () => {
        const dataPoints = fillEmptyDataPoints([], true, 30, { count: 0 })

    })
})
