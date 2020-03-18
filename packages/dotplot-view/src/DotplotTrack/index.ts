/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getConf,
  readConfObject,
  ConfigurationReference,
  ConfigurationSchema,
} from '@gmod/jbrowse-core/configuration'
import { types, getParent, Instance } from 'mobx-state-tree'
import {
  BaseTrackConfig,
  BaseTrack,
} from '@gmod/jbrowse-plugin-linear-genome-view'
import { getSession, makeAbortableReaction } from '@gmod/jbrowse-core/util'
import jsonStableStringify from 'json-stable-stringify'
import DotplotTrackComponent from './components/DotplotTrack'
import ServerSideRenderedBlockContent from '../ServerSideRenderedBlockContent'

export function configSchemaFactory(pluginManager: any) {
  return ConfigurationSchema(
    'DotplotTrack',
    {
      viewType: 'DotplotView',
      adapter: pluginManager.pluggableConfigSchemaType('adapter'),
      renderer: pluginManager.pluggableConfigSchemaType('renderer'),
    },
    {
      baseConfiguration: BaseTrackConfig,
      explicitlyTyped: true,
    },
  )
}

export function stateModelFactory(pluginManager: any, configSchema: any) {
  return types
    .compose(
      'DotplotTrack',
      BaseTrack,
      types
        .model('DotplotTrack', {
          type: types.literal('DotplotTrack'),
          configuration: ConfigurationReference(configSchema),
        })
        .volatile(self => ({
          // avoid circular typescript reference by casting to generic functional component
          renderInProgress: undefined as AbortController | undefined,
          filled: false,
          data: undefined as any,
          imageData: '',
          error: undefined as Error | undefined,
          message: undefined as string | undefined,
          renderingComponent: undefined as any,
          ReactComponent: (DotplotTrackComponent as unknown) as React.FC,
          ReactComponent2: (ServerSideRenderedBlockContent as unknown) as React.FC,
        })),
    )
    .views(self => ({
      get rendererTypeName() {
        return getConf(self, 'renderer').type
      },
      get adapterConfig() {
        return getConf(self, 'adapter')
      },
      get renderProps() {
        return {
          width: 500,
          height: 500,
        }
      },
    }))
    .actions(self => {
      let renderInProgress: undefined | AbortController

      return {
        afterAttach() {
          makeAbortableReaction(
            self as any,
            'render',
            renderBlockData as any,
            renderBlockEffect as any,
            {
              name: `${self.type} ${self.id} rendering`,
              delay: 1000,
              fireImmediately: true,
            },
            self.setLoading,
            self.setRendered,
            self.setError,
          )
        },

        setLoading(abortController: AbortController) {
          self.filled = false
          self.message = undefined
          self.imageData = ''
          self.data = undefined
          self.error = undefined
          self.renderingComponent = undefined
          renderInProgress = abortController
        },
        setMessage(messageText: string) {
          if (renderInProgress && !renderInProgress.signal.aborted) {
            renderInProgress.abort()
          }
          self.filled = false
          self.message = messageText
          self.imageData = ''
          self.data = undefined
          self.error = undefined
          self.renderingComponent = undefined
          renderInProgress = undefined
        },
        setRendered(args: {
          data: any
          imageData: any
          renderingComponent: React.Component
        }) {
          const { data, imageData, renderingComponent } = args
          self.filled = true
          self.message = undefined
          self.imageData = imageData
          self.data = data
          self.error = undefined
          self.renderingComponent = renderingComponent
          renderInProgress = undefined
        },
        setError(error: Error) {
          console.error(error)
          if (renderInProgress && !renderInProgress.signal.aborted) {
            renderInProgress.abort()
          }
          // the rendering failed for some reason
          self.filled = false
          self.message = undefined
          self.imageData = ''
          self.data = undefined
          self.error = error
          self.renderingComponent = undefined
          renderInProgress = undefined
        },
      }
    })
}
function renderBlockData(self: DotplotTrack) {
  const { rpcManager } = getSession(self) as any
  const track = self

  const { renderProps, rendererType } = track

  // Alternative to readConfObject(config) is below
  // used because renderProps is something under our control.
  // Compare to serverSideRenderedBlock
  readConfObject(self.configuration)

  const sequenceConfig: { type?: string } = {}

  const { adapterConfig } = self
  const adapterConfigId = jsonStableStringify(adapterConfig)
  return {
    rendererType,
    rpcManager,
    renderProps,
    renderArgs: {
      views: getParent(self, 2).views,
      adapterType: self.adapterType.name,
      adapterConfig,
      sequenceAdapterType: sequenceConfig.type,
      sequenceAdapterConfig: sequenceConfig,
      rendererType: rendererType.name,
      renderProps,
      sessionId: adapterConfigId,
      timeout: 1000000, // 10000,
    },
  }
}

async function renderBlockEffect(
  props: ReturnType<typeof renderBlockData>,
  signal: AbortSignal,
  self: DotplotTrack,
  allowRefetch = false,
) {
  if (!props) {
    throw new Error('cannot render with no props')
  }

  const { rendererType, rpcManager, renderArgs } = props

  const { imageData, ...data } = await rendererType.renderInClient(
    rpcManager,
    renderArgs,
  )

  return { imageData, data, renderingComponent: rendererType.ReactComponent }
}

export type DotplotTrackModel = ReturnType<typeof stateModelFactory>
export type DotplotTrack = Instance<DotplotTrackModel>