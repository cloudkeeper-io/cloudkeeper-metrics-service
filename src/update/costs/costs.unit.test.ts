import { run } from './costs'

describe('Update Lambda Stats', async () => {
  jest.setTimeout(60000)

  test('happy path', async () => {
    await run()
  })
})
