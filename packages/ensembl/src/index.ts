import DrawerWidgetType from '@gmod/jbrowse-core/pluggableElementTypes/DrawerWidgetType'
import Plugin from '@gmod/jbrowse-core/Plugin'
import { lazy } from 'react'
import PluginManager from '@gmod/jbrowse-core/PluginManager'
import {
  configSchema as variantFeatureDrawerWidgetConfigSchema,
  ReactComponent as VariantFeatureDrawerWidgetReactComponent,
  stateModel as variantFeatureDrawerWidgetStateModel,
} from './EnsemblVEPDrawerWidget'

export default class VariantsPlugin extends Plugin {
  install(pluginManager: PluginManager) {
    pluginManager.addDrawerWidgetType(
      () =>
        new DrawerWidgetType({
          name: 'EnsemblVEPDrawerWidget',
          heading: 'Feature Details',
          configSchema: variantFeatureDrawerWidgetConfigSchema,
          stateModel: variantFeatureDrawerWidgetStateModel,
          LazyReactComponent: lazy(
            () => VariantFeatureDrawerWidgetReactComponent,
          ),
        }),
    )
  }
}
