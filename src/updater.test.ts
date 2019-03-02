import { handler } from './updater'

describe('Token Methods', async () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    try {
      const result = await handler()
    } catch (err) {
      console.log(err)
    }
  })
})
