/* eslint-disable  no-continue,@typescript-eslint/no-explicit-any */
import ComparativeServerSideRendererType from '@gmod/jbrowse-core/pluggableElementTypes/renderers/ComparativeServerSideRendererType'
import { readConfObject } from '@gmod/jbrowse-core/configuration'
import {
  createCanvas,
  createImageBitmap,
} from '@gmod/jbrowse-core/util/offscreenCanvasPonyfill'
import React from 'react'

interface DotplotRenderProps {
  config: any
  height: number
  width: number
  middle: boolean
  horizontallyFlipped: boolean
  highResolutionScaling: number
  linkedTrack: string
  pluginManager: any
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

export default class DotplotRenderer extends ComparativeServerSideRendererType {
  async makeImageData(props: DotplotRenderProps) {
    const { highResolutionScaling: scale = 1, width, height, config } = props
    console.log(props)

    const canvas = createCanvas(Math.ceil(width * scale), height * scale)
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    ctx.strokeStyle = readConfObject(config, 'color')
    ctx.fillStyle = 'red' // readConfObject(config, 'color')
    // const drawMode = readConfObject(config, 'drawMode')
    ctx.fillRect(0, 0, 100, 100)

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