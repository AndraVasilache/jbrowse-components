import TrackType from '@gmod/jbrowse-core/pluggableElementTypes/TrackType'
import AdapterType from '@gmod/jbrowse-core/pluggableElementTypes/AdapterType'
import Plugin from '@gmod/jbrowse-core/Plugin'

import {
  configSchemaFactory as comparativeTrackConfigSchemaFactory,
  stateModelFactory as comparativeTrackStateModelFactory,
} from './LinearComparativeTrack'
import {
  configSchemaFactory as syntenyTrackConfigSchemaFactory,
  stateModelFactory as syntenyTrackStateModelFactory,
} from './LinearSyntenyTrack'
import {
  configSchemaFactory as breakpointTrackConfigSchemaFactory,
  stateModelFactory as breakpointTrackStateModelFactory,
} from './BreakpointSplitTrack'
import {
  configSchema as MCScanSimpleAnchorsConfigSchema,
  AdapterClass as MCScanSimpleAnchorsAdapter,
} from './MCScanSimpleAnchorsAdapter'
import {
  configSchema as MCScanAnchorsConfigSchema,
  AdapterClass as MCScanAnchorsAdapter,
} from './MCScanAnchorsAdapter'
import LinearSyntenyRenderer, {
  configSchema as linearSyntenyRendererConfigSchema,
  ReactComponent as LinearSyntenyRendererReactComponent,
} from './LinearSyntenyRenderer'
import BreakpointSplitRenderer, {
  configSchema as breakpointSplitRendererConfigSchema,
  ReactComponent as BreakpointSplitRendererReactComponent,
} from './BreakpointSplitRenderer'

export default class extends Plugin {
  install(pluginManager) {
    pluginManager.addViewType(() =>
      pluginManager.jbrequire(require('./LinearComparativeView')),
    )
    pluginManager.addViewType(() =>
      pluginManager.jbrequire(require('./LinearSyntenyView')),
    )
    pluginManager.addViewType(() =>
      pluginManager.jbrequire(require('./BreakpointSplitView')),
    )
    pluginManager.addTrackType(() => {
      const configSchema = breakpointTrackConfigSchemaFactory(pluginManager)
      return new TrackType({
        name: 'BreakpointSplitTrack',
        configSchema,
        stateModel: breakpointTrackStateModelFactory(
          pluginManager,
          configSchema,
        ),
      })
    })
    pluginManager.addTrackType(() => {
      const configSchema = comparativeTrackConfigSchemaFactory(pluginManager)
      return new TrackType({
        name: 'LinearComparativeTrack',
        configSchema,
        stateModel: comparativeTrackStateModelFactory(
          pluginManager,
          configSchema,
        ),
      })
    })
    pluginManager.addTrackType(() => {
      const configSchema = syntenyTrackConfigSchemaFactory(pluginManager)
      return new TrackType({
        name: 'LinearSyntenyTrack',
        configSchema,
        stateModel: syntenyTrackStateModelFactory(pluginManager, configSchema),
      })
    })
    pluginManager.addAdapterType(
      () =>
        new AdapterType({
          name: 'MCScanSimpleAnchorsAdapter',
          configSchema: MCScanSimpleAnchorsConfigSchema,
          AdapterClass: MCScanSimpleAnchorsAdapter,
        }),
    )
    pluginManager.addAdapterType(
      () =>
        new AdapterType({
          name: 'MCScanAnchorsAdapter',
          configSchema: MCScanAnchorsConfigSchema,
          AdapterClass: MCScanAnchorsAdapter,
        }),
    )
    pluginManager.addRendererType(
      () =>
        new LinearSyntenyRenderer({
          name: 'LinearSyntenyRenderer',
          configSchema: linearSyntenyRendererConfigSchema,
          ReactComponent: LinearSyntenyRendererReactComponent,
        }),
    )
    pluginManager.addRendererType(
      () =>
        new BreakpointSplitRenderer({
          name: 'BreakpointSplitRenderer',
          configSchema: breakpointSplitRendererConfigSchema,
          ReactComponent: BreakpointSplitRendererReactComponent,
        }),
    )
  }
}
