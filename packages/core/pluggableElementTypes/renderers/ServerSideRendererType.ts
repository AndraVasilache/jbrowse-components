import { renderToString } from 'react-dom/server'
import { filter, ignoreElements, tap } from 'rxjs/operators'
import {
  SnapshotOrInstance,
  SnapshotIn,
  getSnapshot,
  isStateTreeNode,
} from 'mobx-state-tree'
import { BaseFeatureDataAdapter } from '../../data_adapters/BaseAdapter'
import { IRegion } from '../../mst-types'
import { readConfObject } from '../../configuration'
import { checkAbortSignal, iterMap } from '../../util'
import SimpleFeature, {
  Feature,
  SimpleFeatureSerialized,
} from '../../util/simpleFeature'
import RendererType from './RendererType'
import SerializableFilterChain, {
  SerializedFilterChain,
} from './util/serializableFilterChain'
import { AnyConfigurationModel } from '../../configuration/configurationSchema'

interface BaseRenderArgs {
  blockKey: string
  sessionId: string
  signal?: AbortSignal
  dataAdapter: BaseFeatureDataAdapter
  sortObject?: {
    position: number
    by: string
  }
  bpPerPx: number
  renderProps: {
    trackModel: { id: string; selectedFeatureId?: string }
    blockKey: string
  }
  regions: IRegion[]
  originalRegions?: IRegion[]
}

export interface RenderArgs extends BaseRenderArgs {
  config: SnapshotOrInstance<AnyConfigurationModel>
  filters: SerializableFilterChain
}

export interface RenderArgsSerialized extends BaseRenderArgs {
  config: SnapshotIn<AnyConfigurationModel>
  filters: SerializedFilterChain
}
export interface RenderArgsDeserialized extends BaseRenderArgs {
  config: AnyConfigurationModel
  filters: SerializableFilterChain
}

export interface RenderResults {
  html: string
}
export interface ResultsSerialized extends RenderResults {
  features: SimpleFeatureSerialized[]
}

export interface ResultsDeserialized {
  html: string
  blockKey: string
  features: Map<string, Feature>
}

export default class ServerSideRenderer extends RendererType {
  /**
   * directly modifies the render arguments to prepare
   * them to be serialized and sent to the worker.
   *
   * the base class replaces the `renderProps.trackModel` param
   * (which on the client is a MST model) with a stub
   * that only contains the `selectedFeature`, since
   * this is the only part of the track model that most
   * renderers read.
   *
   * @param {object} args the arguments passed to render
   * @returns {object} the same object
   */
  serializeArgsInClient(args: RenderArgs): RenderArgsSerialized {
    const { trackModel } = args.renderProps
    if (trackModel) {
      args.renderProps = {
        blockKey: args.blockKey,
        ...args.renderProps,
        trackModel: {
          id: trackModel.id,
          selectedFeatureId: trackModel.selectedFeatureId,
        },
      }
    }
    return {
      ...args,
      config: isStateTreeNode(args.config)
        ? getSnapshot(args.config)
        : args.config,
      regions: [...args.regions],
      filters: args.filters ? args.filters.toJSON().filters : [],
    }
  }

  deserializeResultsInClient(
    result: ResultsSerialized,
    args: RenderArgs,
  ): ResultsDeserialized {
    // deserialize some of the results that came back from the worker
    const deserialized = ({ ...result } as unknown) as ResultsDeserialized
    const featuresMap = new Map<string, SimpleFeature>()
    result.features.forEach(j => {
      const f = SimpleFeature.fromJSON(j)
      featuresMap.set(String(f.id()), f)
    })
    deserialized.features = featuresMap
    deserialized.blockKey = args.blockKey
    return deserialized
  }

  /**
   * modifies the passed arguments object to
   * inflate arguments as necessary. called in the worker process.
   * @param {object} args the converted arguments to modify
   */
  deserializeArgsInWorker(args: RenderArgsSerialized): RenderArgsDeserialized {
    const deserialized = ({ ...args } as unknown) as RenderArgsDeserialized
    const config = this.configSchema.create(args.config || {})
    deserialized.config = config
    deserialized.filters = new SerializableFilterChain({
      filters: args.filters,
    })

    return deserialized
  }

  /**
   *
   * @param {object} result object containing the results of calling the `render` method
   * @param {Map} features Map of feature.id() -> feature
   */
  serializeResultsInWorker(
    result: { html: string },
    features: Map<string, Feature>,
    args: RenderArgsDeserialized,
  ): ResultsSerialized {
    const serialized = ({ ...result } as unknown) as ResultsSerialized
    serialized.features = iterMap(features.values(), f => f.toJSON())
    return serialized
  }

  /**
   * Render method called on the client. Serializes args, then
   * calls `render` with the RPC manager.
   */
  async renderInClient(rpcManager: { call: Function }, args: RenderArgs) {
    const serializedArgs = this.serializeArgsInClient(args)

    const stateGroupName = args.sessionId
    const result = await rpcManager.call(
      stateGroupName,
      'render',
      serializedArgs,
    )
    // const result = await renderRegionWithWorker(session, serializedArgs)

    const deserialized = this.deserializeResultsInClient(result, args)
    return deserialized
  }

  getExpandedGlyphRegion(region: IRegion, renderArgs: RenderArgsDeserialized) {
    if (!region) return region
    const { bpPerPx, config } = renderArgs
    const maxFeatureGlyphExpansion =
      config === undefined
        ? 0
        : readConfObject(config, 'maxFeatureGlyphExpansion')
    if (!maxFeatureGlyphExpansion) return region
    const bpExpansion = Math.round(maxFeatureGlyphExpansion * bpPerPx)
    return {
      ...region,
      start: Math.floor(Math.max(region.start - bpExpansion, 0)),
      end: Math.ceil(region.end + bpExpansion),
    }
  }

  /**
   * use the dataAdapter to fetch the features to be rendered
   *
   * @param {object} renderArgs
   * @returns {Map} of features as { id => feature, ... }
   */
  async getFeatures(renderArgs: RenderArgsDeserialized) {
    const {
      dataAdapter,
      signal,
      bpPerPx,
      regions,
      originalRegions,
    } = renderArgs
    const features = new Map()

    if (!regions || regions.length === 0) {
      return features
    }

    const requestRegions = regions.map((r: IRegion) => {
      // make sure the requested region's start and end are integers, if
      // there is a region specification.
      const requestRegion = { ...r }
      if (requestRegion.start) {
        requestRegion.start = Math.floor(requestRegion.start)
      }
      if (requestRegion.end) {
        requestRegion.end = Math.ceil(requestRegion.end)
      }
      return requestRegion
    })

    const featureObservable =
      requestRegions.length === 1
        ? dataAdapter.getFeaturesInRegion(
            this.getExpandedGlyphRegion(requestRegions[0], renderArgs),
            {
              signal,
              bpPerPx,
              originalRegions,
            },
          )
        : dataAdapter.getFeaturesInMultipleRegions(requestRegions, {
            signal,
            bpPerPx,
            originalRegions,
          })

    await featureObservable
      .pipe(
        tap(() => checkAbortSignal(signal)),
        filter(feature => this.featurePassesFilters(renderArgs, feature)),
        tap(feature => {
          const id = feature.id()
          if (!id) throw new Error(`invalid feature id "${id}"`)
          features.set(id, feature)
        }),
        ignoreElements(),
      )
      .toPromise()

    return features
  }

  /**
   * @param {object} renderArgs
   * @param {FeatureI} feature
   * @returns {boolean} true if this feature passes all configured filters
   */
  featurePassesFilters(renderArgs: RenderArgsDeserialized, feature: Feature) {
    if (!renderArgs.filters) return true
    return renderArgs.filters.passes(feature, renderArgs)
  }

  // render method called on the worker
  async renderInWorker(args: RenderArgsSerialized): Promise<ResultsSerialized> {
    checkAbortSignal(args.signal)
    const deserialized = this.deserializeArgsInWorker(args)

    const features = await this.getFeatures(deserialized)
    checkAbortSignal(args.signal)

    const results = await this.render({ ...deserialized, features })
    checkAbortSignal(args.signal)
    const html = renderToString(results.element)
    delete results.element

    // serialize the results for passing back to the main thread.
    // these will be transmitted to the main process, and will come out
    // as the result of renderRegionWithWorker.
    return this.serializeResultsInWorker(
      { ...results, html },
      features,
      deserialized,
    )
  }

  freeResourcesInClient(rpcManager: { call: Function }, args: RenderArgs) {
    const serializedArgs = this.serializeArgsInClient(args)

    const stateGroupName = args.sessionId
    return rpcManager.call(stateGroupName, 'freeResources', serializedArgs)
  }

  freeResourcesInWorker(args: Record<string, unknown>) {
    /* stub method */
  }
}
