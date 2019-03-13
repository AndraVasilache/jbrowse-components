import { toArray } from 'rxjs/operators'

import Adapter from './TwoBitAdapter'

test('adapter can fetch features from volvox.2bit', async () => {
  const adapter = new Adapter({
    twoBitLocation: { localPath: require.resolve('./test_data/volvox.2bit') },
  })

  const features = await adapter.getFeatures({
    refName: 'ctgA',
    start: 0,
    end: 20000,
  })

  const featuresArray = await features.pipe(toArray()).toPromise()
  expect(featuresArray).toMatchSnapshot()
})
