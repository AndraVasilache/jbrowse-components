import SimpleFeature from '@gmod/jbrowse-core/util/simpleFeature'
import '@testing-library/jest-dom/extend-expect'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import LinearSyntenyRenderer from './LinearSyntenyRenderer'
import configSchema from './configSchema'

expect.extend({ toMatchImageSnapshot })

// these tests do very little, let's try to expand them at some point
test('test rendering a simple synteny from fake data', async () => {
  const renderer = new LinearSyntenyRenderer({
    ReactComponent: () => null,
    name: 'LinearSyntenyRenderer',
    configSchema,
  })

  const result = await renderer.render({
    width: 800,
    height: 600,
    config: { color: 'rgba(255,100,100,0.3)' },
    horizontallyFlipped: false,
    highResolutionScaling: 1,
    trackIds: ['peach_gene', 'grape_gene'],
    views: [
      {
        offsetPx: 0,
        bpPerPx: 1,
        features: [
          new SimpleFeature({
            id: 1,
            data: { start: 0, end: 100, refName: 'chr1' },
          }),
        ],
        staticBlocks: [
          { assemblyName: 'hg38', refName: 'chr1', start: 0, end: 999 },
        ],
        displayedRegions: [
          { assemblyName: 'hg38', refName: 'chr1', start: 0, end: 999 },
        ],
        dynamicBlocks: [],
        height: 100,
        horizontallyFlipped: false,
        tracks: [],
        headerHeight: 10,
        scaleBarHeight: 32,
      },
      {
        offsetPx: 0,
        bpPerPx: 1,
        features: [
          new SimpleFeature({
            id: 1,
            data: { start: 900, end: 999, refName: 'chr1' },
          }),
        ],
        staticBlocks: [
          { assemblyName: 'mm10', refName: 'chr1', start: 0, end: 999 },
        ],
        displayedRegions: [
          { assemblyName: 'mm10', refName: 'chr1', start: 0, end: 999 },
        ],
        dynamicBlocks: [],
        height: 100,
        tracks: [],
        horizontallyFlipped: false,
        headerHeight: 10,
        scaleBarHeight: 32,
      },
    ],
  })
  const r = await result.imageData

  const data = r.src.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(data, 'base64')
  // this is needed to do a fuzzy image comparison because
  // the travis-ci was 2 pixels different for some reason, see PR #710
  // @ts-ignore
  expect(buf).toMatchImageSnapshot()
})