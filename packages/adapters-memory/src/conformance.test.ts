import { testCatalogPort, testIdentityPort, testPersistencePort } from '@tricc/core/testing'
import { MemoryCatalog, MemoryIdentity, MemoryPersistence } from './index.js'

testPersistencePort({
  name: 'MemoryPersistence',
  create: async () => ({ port: new MemoryPersistence(), ref: { id: 'p1', name: 'Project one' } }),
})

testPersistencePort({
  name: 'MemoryPersistence (whole-file writer)',
  create: async () => ({
    port: new MemoryPersistence({ canWatch: false, canWriteIncrementally: false }),
    ref: { id: 'p1', name: 'Project one' },
  }),
})

testCatalogPort({ name: 'MemoryCatalog', create: async () => ({ port: new MemoryCatalog() }) })

testIdentityPort({ name: 'MemoryIdentity', create: () => ({ port: new MemoryIdentity() }) })
