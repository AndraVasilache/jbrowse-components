/* eslint-disable  no-nested-ternary */
import { readConfObject } from '@gmod/jbrowse-core/configuration'
import ComparativeRendererType from '@gmod/jbrowse-core/pluggableElementTypes/renderers/ComparativeRendererType'
import { Feature } from '@gmod/jbrowse-core/util/simpleFeature'
import { bpSpanPx, iterMap } from '@gmod/jbrowse-core/util'
import { IRegion } from '@gmod/jbrowse-core/mst-types'
import {
  createCanvas,
  createImageBitmap,
} from '@gmod/jbrowse-core/util/offscreenCanvasPonyfill'
import React from 'react'
import { yPos, getPxFromCoordinate, cheight } from '../util'
import { LinearSyntenyTrackModel } from '../LinearSyntenyTrack'
import { LinearSyntenyViewModel } from '../LinearSyntenyView/model'

const [LEFT, , RIGHT] = [0, 1, 2, 3]

export interface ReducedLinearGenomeViewModel {
  bpPerPx: number
  offsetPx: number
  staticBlocks: IRegion[]
  dynamicBlocks: IRegion[]
  headerHeight: number
  scaleBarHeight: number
  height: number
  reversed: boolean
  tracks: {
    scrollTop: number
    height: number
    trackId: string
  }[]
}

interface LayoutMatch {
  level: number
  layout: LayoutTuple
  feature: Feature
  refName: string
}
interface LinearSyntenyRenderProps {
  features: Map<string, Feature>
  config: any // eslint-disable-line @typescript-eslint/no-explicit-any
  height: number
  width: number
  horizontallyFlipped: boolean
  highResolutionScaling: number
  trackIds: string[]
  views: ReducedLinearGenomeViewModel[]
  layoutMatches: LayoutMatch[][]
}

interface LinearSyntenyImageData {
  imageData?: ImageBitmap
  height: number
  width: number
  maxHeightReached: boolean
}
interface LayoutRecord {
  feature: Feature
  leftPx: number
  rightPx: number
  topPx: number
  heightPx: number
}

type LayoutTuple = [number, number, number, number]

export default class LinearSyntenyRenderer extends ComparativeRendererType {
  private ReactComponent: any

  constructor(stuff: any) {
    super(stuff)
    this.ReactComponent = stuff.ReactComponent
  }

  async makeImageData(props: LinearSyntenyRenderProps) {
    const {
      highResolutionScaling = 1,
      width,
      height,
      views,
      layoutMatches,
      trackIds,
    } = props

    const canvas = createCanvas(
      Math.ceil(width * highResolutionScaling),
      height * highResolutionScaling,
    )
    const ctx = canvas.getContext('2d')
    // const ctx = canvas.getContext('2d')
    // ctx.scale(highResolutionScaling, highResolutionScaling)
    // ctx.font = 'bold 10px Courier New,monospace'
    const showIntraviewLinks = false
    const middle = false
    const hideTiny = false

    layoutMatches.forEach(chunk => {
      // we follow a path in the list of chunks, not from top to bottom, just in series
      // following x1,y1 -> x2,y2
      for (let i = 0; i < chunk.length - 1; i += 1) {
        const { layout: c1, feature: f1, level: level1, refName: ref1 } = chunk[
          i
        ]
        const { layout: c2, feature: f2, level: level2, refName: ref2 } = chunk[
          i + 1
        ]
        const v1 = views[level1]
        const v2 = views[level2]

        if (!c1 || !c2) {
          console.warn('received null layout for a overlay feature')
          return
        }

        // disable rendering connections in a single level
        if (!showIntraviewLinks && level1 === level2) {
          return
        }
        const l1 = f1.get('end') - f1.get('start')
        const l2 = f2.get('end') - f2.get('start')
        let tiny = false

        if (l1 < v1.bpPerPx || l2 < v2.bpPerPx) {
          tiny = true
          if (hideTiny) {
            // eslint-disable-next-line no-continue
            continue
          }
        }
        if (
          !v1.staticBlocks.find(region => region.refName === ref1) ||
          !v2.staticBlocks.find(region => region.refName === ref2)
        ) {
          //  eslint-disable-next-line no-continue
          continue
        }

        const x11 = getPxFromCoordinate(v1, ref1, c1[LEFT])
        const x12 = getPxFromCoordinate(v1, ref1, c1[RIGHT])
        const x21 = getPxFromCoordinate(v2, ref2, c2[LEFT])
        const x22 = getPxFromCoordinate(v2, ref2, c2[RIGHT])

        const y1 = middle
          ? level1 < level2
            ? 0
            : 150
          : yPos(trackIds[0], level1, views, c1) +
            (level1 < level2 ? cheight(c1) : 0)
        const y2 = middle
          ? level2 < level1
            ? 0
            : 150
          : yPos(trackIds[1], level2, views, c2) +
            (level2 < level1 ? cheight(c2) : 0)
        ctx.fillStyle = 'rgba(255,100,100,0.3)'
        ctx.strokeStyle = 'rgba(50,50,50,0.1)'

        ctx.beginPath()
        ctx.moveTo(x11, y1)
        ctx.lineTo(x12, y1)
        ctx.lineTo(x22, y2)
        ctx.lineTo(x21, y2)
        ctx.closePath()
        ctx.fill()
      }
    })

    const imageData = await createImageBitmap(canvas)
    return {
      imageData,
      height: 0,
      width: 0,
    }
  }

  async render(renderProps: LinearSyntenyRenderProps) {
    const { height, width, imageData } = await this.makeImageData(renderProps)
    const element = React.createElement(
      this.ReactComponent,
      { ...renderProps, height, width, imageData },
      null,
    )
    return {
      element,
      imageData,
      height,
      width,
    }
  }
}
