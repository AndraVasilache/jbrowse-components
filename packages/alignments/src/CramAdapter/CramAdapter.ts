import { CraiIndex, IndexedCramFile } from '@gmod/cram'
import {
  BaseFeatureDataAdapter,
  BaseOptions,
} from '@gmod/jbrowse-core/data_adapters/BaseAdapter'
import { IRegion } from '@gmod/jbrowse-core/mst-types'
import { checkAbortSignal } from '@gmod/jbrowse-core/util'
import { openLocation } from '@gmod/jbrowse-core/util/io'
import { readConfObject } from '@gmod/jbrowse-core/configuration'
import { ObservableCreate } from '@gmod/jbrowse-core/util/rxjs'
import { Feature } from '@gmod/jbrowse-core/util/simpleFeature'
import { toArray } from 'rxjs/operators'
import PluginManager from '@gmod/jbrowse-core/PluginManager'
import { AnyConfigurationModel } from '@gmod/jbrowse-core/configuration/configurationSchema'
import { getSubAdapterType } from '@gmod/jbrowse-core/data_adapters/dataAdapterCache'
import CramSlightlyLazyFeature from './CramSlightlyLazyFeature'

interface HeaderLine {
  tag: string
  value: string
}

interface Header {
  idToName?: string[]
  nameToId?: Record<string, number>
}

export default (pluginManager: PluginManager) => {
  class CramAdapter extends BaseFeatureDataAdapter {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private cram: any

    private sequenceAdapter: BaseFeatureDataAdapter

    private samHeader: Header = {}

    // maps a refname to an id
    private seqIdToRefName: string[] | undefined

    // maps a seqId to original refname, passed specially to render args, to a seqid
    private seqIdToOriginalRefName: string[] = []

    public constructor(
      config: AnyConfigurationModel,
      getSubAdapter: getSubAdapterType,
    ) {
      super()

      const cramLocation = readConfObject(config, 'cramLocation')
      const craiLocation = readConfObject(config, 'craiLocation')
      if (!cramLocation) {
        throw new Error('missing cramLocation argument')
      }
      if (!craiLocation) {
        throw new Error('missing craiLocation argument')
      }
      this.cram = new IndexedCramFile({
        cramFilehandle: openLocation(cramLocation),
        index: new CraiIndex({ filehandle: openLocation(craiLocation) }),
        seqFetch: this.seqFetch.bind(this),
        checkSequenceMD5: false,
        fetchSizeLimit: config.fetchSizeLimit || 600000000,
      })

      // instantiate the sequence adapter
      const sequenceAdapterType = readConfObject(config, [
        'sequenceAdapter',
        'type',
      ])
      const sequenceAdapterConfig = readConfObject(config, 'sequenceAdapter')
      const sequenceAdapter = getSubAdapter(
        sequenceAdapterType,
        sequenceAdapterConfig,
      ).dataAdapter
      if (sequenceAdapter instanceof BaseFeatureDataAdapter) {
        this.sequenceAdapter = sequenceAdapter
      } else {
        throw new Error(
          `CRAM feature adapters cannot use sequence adapters of type '${sequenceAdapterType}'`,
        )
      }
    }

    async seqFetch(seqId: number, start: number, end: number) {
      start -= 1 // convert from 1-based closed to interbase

      const refSeqStore = this.sequenceAdapter
      if (!refSeqStore) return undefined
      const refName = this.refIdToOriginalName(seqId)
      if (!refName) return undefined

      const features = await refSeqStore.getFeatures(
        {
          refName,
          start,
          end,
          assemblyName: '',
        },
        {},
      )

      const seqChunks = await features.pipe(toArray()).toPromise()

      const trimmed: string[] = []
      seqChunks
        .sort((a: Feature, b: Feature) => a.get('start') - b.get('start'))
        .forEach((chunk: Feature, i: number) => {
          const chunkStart = chunk.get('start')
          const chunkEnd = chunk.get('end')
          const trimStart = Math.max(start - chunkStart, 0)
          const trimEnd = Math.min(end - chunkStart, chunkEnd - chunkStart)
          const trimLength = trimEnd - trimStart
          const chunkSeq = chunk.get('seq') || chunk.get('residues')
          trimmed.push(chunkSeq.substr(trimStart, trimLength))
        })

      const sequence = trimmed.join('')
      if (sequence.length !== end - start)
        throw new Error(
          `sequence fetch failed: fetching ${(
            start - 1
          ).toLocaleString()}-${end.toLocaleString()} only returned ${sequence.length.toLocaleString()} bases, but should have returned ${(
            end - start
          ).toLocaleString()}`,
        )
      return sequence
    }

    async setup(opts?: BaseOptions) {
      if (Object.keys(this.samHeader).length === 0) {
        const samHeader = await this.cram.cram.getSamHeader()

        // use the @SQ lines in the header to figure out the
        // mapping between ref ref ID numbers and names
        const idToName: string[] = []
        const nameToId: Record<string, number> = {}
        const sqLines = samHeader.filter((l: { tag: string }) => l.tag === 'SQ')
        sqLines.forEach((sqLine: { data: HeaderLine[] }, refId: number) => {
          sqLine.data.forEach((item: HeaderLine) => {
            if (item.tag === 'SN') {
              // this is the ref name
              const refName = item.value
              nameToId[refName] = refId
              idToName[refId] = refName
            }
          })
        })
        if (idToName.length) {
          this.samHeader = { idToName, nameToId }
        }
      }
    }

    async getRefNames(opts?: BaseOptions) {
      await this.setup(opts)
      if (this.samHeader.idToName) {
        return this.samHeader.idToName
      }
      if (this.sequenceAdapter) {
        return this.sequenceAdapter.getRefNames()
      }
      throw new Error('unable to get refnames')
    }

    // use info from the SAM header if possible, but fall back to using
    // the ref seq order from when the browser's refseqs were loaded
    refNameToId(refName: string) {
      if (this.samHeader.nameToId) {
        return this.samHeader.nameToId[refName]
      }
      if (this.seqIdToRefName) {
        return this.seqIdToRefName.indexOf(refName)
      }
      return undefined
    }

    // use info from the SAM header if possible, but fall back to using
    // the ref seq order from when the browser's refseqs were loaded
    refIdToName(refId: number) {
      if (this.samHeader.idToName) {
        return this.samHeader.idToName[refId]
      }
      if (this.seqIdToRefName) {
        return this.seqIdToRefName[refId]
      }
      return undefined
    }

    // use info from the SAM header if possible, but fall back to using
    // the ref seq order from when the browser's refseqs were loaded
    refIdToOriginalName(refId: number) {
      return this.seqIdToOriginalRefName[refId]
    }

    /**
     * Fetch features for a certain region. Use getFeaturesInRegion() if you also
     * want to verify that the store has features for the given reference sequence
     * before fetching.
     * @param {IRegion} param
     * @param {AbortSignal} [signal] optional signalling object for aborting the fetch
     * @returns {Observable[Feature]} Observable of Feature objects in the region
     */
    getFeatures({ refName, start, end }: IRegion, opts: BaseOptions = {}) {
      return ObservableCreate<Feature>(async observer => {
        await this.setup(opts)
        if (this.sequenceAdapter && !this.seqIdToRefName) {
          this.seqIdToRefName = await this.sequenceAdapter.getRefNames(opts)
        }
        const refId = this.refNameToId(refName)
        if (refId !== undefined) {
          this.seqIdToOriginalRefName[refId] =
            (opts.originalRegion || {}).refName || refName
          const records = await this.cram.getRecordsForRange(
            refId,
            start,
            end,
            opts,
          )
          checkAbortSignal(opts.signal)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          records.forEach((record: any) => {
            observer.next(this.cramRecordToFeature(record))
          })
        }
        observer.complete()
      })
    }

    /**
     * called to provide a hint that data tied to a certain region
     * will not be needed for the forseeable future and can be purged
     * from caches, etc
     */
    freeResources(/* { region } */): void {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cramRecordToFeature(record: any): Feature {
      return new CramSlightlyLazyFeature(record, this)
    }
  }
  return CramAdapter
}
