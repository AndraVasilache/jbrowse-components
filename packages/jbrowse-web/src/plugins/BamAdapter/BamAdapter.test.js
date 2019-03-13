import { toArray } from 'rxjs/operators'

import Adapter from './BamAdapter'

test('adapter can fetch features from volvox.bam', async () => {
  const adapter = new Adapter({
    bamLocation: {
      localPath: require.resolve('./test_data/volvox-sorted.bam'),
    },
    index: {
      location: {
        localPath: require.resolve('./test_data/volvox-sorted.bam.bai'),
      },
      indexType: 'BAI',
    },
  })

  const features = await adapter.getFeatures({
    refName: 'ctgA',
    start: 0,
    end: 20000,
  })

  const featuresArray = await features.pipe(toArray()).toPromise()
  expect(featuresArray[0].get('refName')).toBe('ctgA')
  const featuresJsonArray = featuresArray.map(f => f.toJSON())
  expect(featuresJsonArray.length).toEqual(3809)
  expect(featuresJsonArray.slice(1000, 1010)).toMatchSnapshot()

  expect(await adapter.refIdToName(0)).toBe('ctgA')
  expect(await adapter.refIdToName(1)).toBe(undefined)

  expect(await adapter.hasDataForRefName('ctgA')).toBe(true)
})
