import AdapterType from '@gmod/jbrowse-core/pluggableElementTypes/AdapterType'
import DrawerWidgetType from '@gmod/jbrowse-core/pluggableElementTypes/DrawerWidgetType'
import TrackType from '@gmod/jbrowse-core/pluggableElementTypes/TrackType'
import Plugin from '@gmod/jbrowse-core/Plugin'
import { lazy } from 'react'
import PluginManager from '@gmod/jbrowse-core/PluginManager'
import {
  configSchema as variantFeatureDrawerWidgetConfigSchema,
  ReactComponent as VariantFeatureDrawerWidgetReactComponent,
  stateModel as variantFeatureDrawerWidgetStateModel,
} from './VariantFeatureDrawerWidget'


    pluginManager.addDrawerWidgetType(
      () =>
        new DrawerWidgetType({
          name: 'VariantFeatureDrawerWidget',
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
