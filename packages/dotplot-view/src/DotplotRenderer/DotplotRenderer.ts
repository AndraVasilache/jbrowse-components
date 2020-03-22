/* eslint-disable  @typescript-eslint/no-explicit-any */
import ComparativeServerSideRendererType from '@gmod/jbrowse-core/pluggableElementTypes/renderers/ComparativeServerSideRendererType'
import { readConfObject } from '@gmod/jbrowse-core/configuration'
import { IRegion } from '@gmod/jbrowse-core/mst-types'
import { Feature } from '@gmod/jbrowse-core/util/simpleFeature'
import {
  createCanvas,
  createImageBitmap,
} from '@gmod/jbrowse-core/util/offscreenCanvasPonyfill'
import React from 'react'

interface ReducedView {
  features: Feature[]
  displayedRegions: IRegion[]
  horizontallyFlipped: boolean
  bpPerPx: number
}

export interface DotplotRenderProps {
  config: any
  height: number
  width: number
  borderSize: number
  fontSize: number
  highResolutionScaling: number
  pluginManager: any
  views: ReducedView[]
}

interface DotplotRenderingProps extends DotplotRenderProps {
  imageData: any
}

interface DotplotImageData {
  imageData?: ImageBitmap
  height: number
  width: number
  maxHeightReached: boolean
}

function bpToPx(self: ReducedView, refName: string, coord: number) {
  let offsetBp = 0

  const index = self.displayedRegions.findIndex((r: IRegion) => {
    if (refName === r.refName && coord >= r.start && coord <= r.end) {
      offsetBp += self.horizontallyFlipped ? r.end - coord : coord - r.start
      return true
    }
    offsetBp += r.end - r.start
    return false
  })
  const foundRegion = self.displayedRegions[index]
  if (foundRegion) {
    return Math.round(offsetBp / self.bpPerPx)
  }
  return undefined
}

export default class DotplotRenderer extends ComparativeServerSideRendererType {
  async makeImageData(props: DotplotRenderProps) {
    const {
      highResolutionScaling: scale = 1,
      width,
      height,
      borderSize,
      config,
      views,
    } = props
    console.log('renderer', views)

    const canvas = createCanvas(Math.ceil(width * scale), height * scale)
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    ctx.fillStyle = 'black'

    // clip method avoids drawing outside box
    ctx.rect(
      borderSize,
      borderSize,
      width - borderSize * 2,
      height - borderSize * 2,
    )
    ctx.clip()

    ctx.lineWidth = 3
    ctx.fillStyle = readConfObject(config, 'color')
    views[0].features.forEach(feature => {
      const start = feature.get('start')
      const end = feature.get('end')
      const refName = feature.get('refName')
      const mate = feature.get('mate')
      // const identity = feature.get('numMatches') / feature.get('blockLen')
      ctx.fillStyle = readConfObject(config, 'color')
      // 'black' // `hsl(${identity * 150},50%,50%)`
      const b1 = bpToPx(views[0], refName, start)
      const b2 = bpToPx(views[0], refName, end)
      const e1 = bpToPx(views[1], mate.refName, mate.start)
      const e2 = bpToPx(views[1], mate.refName, mate.end)
      if (b1 && b2 && e1 && e2) {
        if (b1 - b2 < 3 && e1 - e2 < 3) {
          ctx.fillRect(b1 + borderSize, height - borderSize - e1, 3, 3)
        } else {
          ctx.beginPath()
          ctx.moveTo(b1, height - e1)
          ctx.lineTo(b2, height - e2)
          ctx.stroke()
        }
      }
    })
    // views[1].features.forEach(feature => {
    //   const start = feature.get('start')
    //   const end = feature.get('end')
    //   const refName = feature.get('refName')
    //   const mate = feature.get('mate')
    //   const b1 = bpToPx(views[0], refName, start)
    //   const b2 = bpToPx(views[0], refName, end)
    //   const e1 = bpToPx(views[1], mate.refName, mate.start)
    //   const e2 = bpToPx(views[1], mate.refName, mate.end)
    //   if (b1 && b2 && e1 && e2) {
    //     if (b1 - b2 < 3 && e1 - e2 < 3) {
    //       ctx.fillRect(b1, height - e1, 3, 3)
    //     } else {
    //       ctx.beginPath()
    //       ctx.moveTo(b1, height - e1)
    //       ctx.lineTo(b2, height - e2)
    //       ctx.stroke()
    //     }
    //   }
    // })

    // ctx.fillStyle = 'red' // readConfObject(config, 'color')
    // // const drawMode = readConfObject(config, 'drawMode')
    // ctx.fillRect(0, 0, 100, 100)

    const imageData = await createImageBitmap(canvas)
    return {
      imageData,
      height,
      width,
    }
  }

  async render(renderProps: DotplotRenderProps) {
    const { height, width, imageData } = await this.makeImageData(renderProps)

    const element = React.createElement(
      // @ts-ignore
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
