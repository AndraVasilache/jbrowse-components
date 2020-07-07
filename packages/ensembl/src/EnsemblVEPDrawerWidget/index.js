import { ConfigurationSchema } from '@gmod/jbrowse-core/configuration'
import { ElementId } from '@gmod/jbrowse-core/util/types/mst'
import { types } from 'mobx-state-tree'

export const configSchema = ConfigurationSchema('EnsemblVEPDrawerWidget', {})
export const stateModel = types
  .model('EnsemblVEPDrawerWidget', {
    id: ElementId,
    type: types.literal('EnsemblVEPDrawerWidget'),
    featureData: types.frozen({}),
  })
  .actions(self => ({
    setFeatureData(data) {
      self.featureData = data
    },
    clearFeatureData() {
      self.featureData = {}
    },
  }))

export const ReactComponent = import(
  './EnsemblTransciptConsequencesDrawerWidget'
)
