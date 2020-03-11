import NCListStore from '@gmod/nclist'
import { openUrl } from '@gmod/jbrowse-core/util/io'
import { IRegion } from '@gmod/jbrowse-core/mst-types'
import {
  BaseFeatureDataAdapter,
  BaseOptions,
} from '@gmod/jbrowse-core/data_adapters/BaseAdapter'
import { Feature } from '@gmod/jbrowse-core/util/simpleFeature'
import { ObservableCreate } from '@gmod/jbrowse-core/util/rxjs'
import { checkAbortSignal } from '@gmod/jbrowse-core/util'
import objectHash from 'object-hash'

import { Instance, getSnapshot } from 'mobx-state-tree'
import { readConfObject } from '@gmod/jbrowse-core/configuration'
import NCListFeature from './NCListFeature'
import MyConfigSchema from './configSchema'

export default class extends BaseFeatureDataAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nclist: any

  private configRefNames?: string[]

  private id: string

  constructor(config: Instance<typeof MyConfigSchema>) {
    super()
    const refNames = readConfObject(config, 'refNames')
    const rootUrlTemplate = readConfObject(config, 'rootUrlTemplate')
    this.configRefNames = refNames
    this.id = objectHash(getSnapshot(config))

    this.nclist = new NCListStore({
      baseUrl: '',
      urlTemplate: rootUrlTemplate,
      readFile: (url: string) => openUrl(url).readFile(),
    })
  }

  /**
   * Fetch features for a certain region. Use getFeaturesInRegion() if you also
   * want to verify that the store has features for the given reference sequence
   * before fetching.
   * @param {IRegion} param
   * @param {AbortSignal} [signal] optional signalling object for aborting the fetch
   * @returns {Observable[Feature]} Observable of Feature objects in the region
   */
  getFeatures(region: IRegion, opts: BaseOptions = {}) {
    return ObservableCreate<Feature>(async observer => {
      const { signal } = opts
      for await (const feature of this.nclist.getFeatures(region, opts)) {
        checkAbortSignal(signal)
        observer.next(this.wrapFeature(feature))
      }
      observer.complete()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapFeature(ncFeature: any): NCListFeature {
    return new NCListFeature(
      ncFeature,
      undefined,
      `${this.id}-${ncFeature.id()}`,
    )
  }

  async hasDataForRefName(refName: string) {
    const root = await this.nclist.getDataRoot(refName)
    return !!(root && root.stats && root.stats.featureCount)
  }

  /*
   * NCList is unable to get list of ref names so returns empty
   * @return Promise<string[]> of empty list
   */
  async getRefNames() {
    return this.configRefNames || []
  }

  /**
   * called to provide a hint that data tied to a certain region
   * will not be needed for the forseeable future and can be purged
   * from caches, etc
   */
  freeResources() {}
}
