import { getConf } from '@gmod/jbrowse-core/configuration'
import { BaseTrackControls } from '@gmod/jbrowse-plugin-linear-genome-view'
import { observer } from 'mobx-react'
import React from 'react'

export default observer(({ track, view, onConfigureClick, session }) => (
  <>
    <BaseTrackControls
      track={track}
      view={view}
      onConfigureClick={onConfigureClick}
      session={session}
    />
    <select
      onChange={evt => track.setRenderer(evt.target.value)}
      value={track.selectedRendering || getConf(track, 'defaultRendering')}
    >
      {track.rendererTypeChoices.map(typeName => (
        <option key={typeName} value={typeName}>
          {typeName}
        </option>
      ))}
    </select>
  </>
))
