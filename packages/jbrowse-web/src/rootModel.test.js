import { getSnapshot } from 'mobx-state-tree'
import { createTestEnv } from './JBrowse'

jest.mock('shortid', () => ({ generate: () => 'testid' }))

test('can load configuration with the configure() action and resolve references to view configurations', async () => {
  const { rootModel } = await createTestEnv({ configId: 'fogbat' })

  expect(getSnapshot(rootModel.configuration)).toMatchSnapshot()
})

test('can load configuration from a config object', async () => {
  const { rootModel } = await createTestEnv({
    rpc: { defaultDriver: 'MainThreadRpcDriver' },
    assemblies: {
      volvox: {
        configId: 'volvox',
        sequence: {
          type: 'ReferenceSequence',
          adapter: {
            configId: 'Zd0NLmtxPZ3',
            type: 'FromConfigAdapter',
            features: [],
          },
        },
        aliases: ['vvx'],
        refNameAliases: {
          adapter: {
            configId: 'Zd0NLmtxPZ2',
            type: 'FromConfigAdapter',
            features: [],
          },
        },
      },
    },
  })

  expect(getSnapshot(rootModel.configuration)).toMatchSnapshot()
})

test('can load configuration from a file', async () => {
  const { rootModel } = await createTestEnv({
    localPath: require.resolve('../test_data/config_volvox_mainthread.json'),
  })

  expect(getSnapshot(rootModel.configuration)).toMatchSnapshot()
})
