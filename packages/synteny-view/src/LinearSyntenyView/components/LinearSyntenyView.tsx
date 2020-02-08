import { makeStyles } from '@material-ui/core/styles'
import { LinearSyntenyViewModel } from '../model'

// return !syntenyGroup
//   ? null
//   : [
//       getConf(model, 'showAnchors') &&
//         model.allMatchedAnchorFeatures[syntenyGroup],
//       getConf(model, 'showSimpleAnchors') &&
//         model.allMatchedSimpleAnchorFeatures[syntenyGroup],
//       getConf(model, 'showPaf') && model.minimap2Features,
//       getConf(model, 'showSam') && model.samFeatures,
//       model.getMatchedFeaturesInLayout(
//         syntenyGroup,
//         model.allMatchedSyntenyFeatures[syntenyGroup],
//       ),
//     ].map((layoutMatches, index) =>
//       layoutMatches ? (
//         <Overlay
//           key={`${syntenyGroup}_${index}`}
//           syntenyGroup={syntenyGroup}
//           layoutMatches={layoutMatches}
//           model={model}
//         />
//       ) : null,
//

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (pluginManager: any) => {
  const { jbrequire } = pluginManager
  const { observer, PropTypes } = jbrequire('mobx-react')
  const React = jbrequire('react')
  const { getConf } = jbrequire('@gmod/jbrowse-core/configuration')
  const { makeStyles: jbrequiredMakeStyles } = jbrequire(
    '@material-ui/core/styles',
  )

  const Header = jbrequire(require('./Header'))
  const { grey } = jbrequire('@material-ui/core/colors')

  const useStyles = (jbrequiredMakeStyles as typeof makeStyles)(theme => {
    return {
      root: {
        position: 'relative',
        marginBottom: theme.spacing(1),
        overflow: 'hidden',
      },
      breakpointMarker: {
        position: 'absolute',
        top: 0,
        height: '100%',
        width: '3px',
        background: 'magenta',
      },
      viewContainer: {
        marginTop: '3px',
      },
      container: {
        display: 'grid',
        background: grey[300],
      },
      overlay: {
        display: 'flex',
        width: '100%',
        gridArea: '1/1',
        '& path': {
          cursor: 'crosshair',
          fill: 'none',
        },
      },
      content: {
        gridArea: '1/1',
      },
    }
  })

  const Overlays = observer(
    ({ model }: { model: LinearSyntenyViewModel; syntenyGroup: string }) => (
      <>
        {model.tracks.map(track => {
          const syntenyGroup = model.getSyntenyGroup(track) || ''
          return (
            <track.ReactComponent
              key={getConf(track, 'trackId')}
              syntenyGroup={model.getSyntenyGroup(track)}
              layoutMatches={model.allMatchedSimpleAnchorFeatures[syntenyGroup]}
              model={model}
              track={track}
            />
          )
        })}
      </>
    ),
  )

  // The synteny is in the middle of the views
  const MiddleSyntenyView = observer(
    ({ model }: { model: LinearSyntenyViewModel }) => {
      const classes = useStyles()
      const { views, controlsWidth } = model
      const { ReactComponent } = pluginManager.getViewType(views[0].type)
      return (
        <div>
          <Header model={model} />
          <div className={classes.container}>
            <div className={classes.content}>
              <div style={{ position: 'relative' }}>
                <div className={classes.viewContainer}>
                  <ReactComponent model={views[0]} />
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: controlsWidth, flexShrink: 0 }} />
                  <svg
                    style={{
                      width: '100%',
                    }}
                  >
                    <Overlays model={model} />
                  </svg>
                </div>
                <div className={classes.viewContainer}>
                  <ReactComponent model={views[1]} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
  )
  const OverlaySyntenyView = observer(
    ({ model }: { model: LinearSyntenyViewModel }) => {
      const classes = useStyles()
      const { views, controlsWidth } = model
      return (
        <div>
          <Header model={model} />
          <div className={classes.container}>
            <div className={classes.content}>
              <div style={{ position: 'relative' }}>
                {views.map(view => {
                  const { ReactComponent } = pluginManager.getViewType(
                    view.type,
                  )
                  return (
                    <div key={view.id} className={classes.viewContainer}>
                      <ReactComponent model={view} />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className={classes.overlay}>
              <div style={{ width: controlsWidth, flexShrink: 0 }} />
              <svg
                style={{
                  width: '100%',
                  zIndex: 10,
                  pointerEvents: model.interactToggled ? undefined : 'none',
                }}
              >
                <Overlays model={model} />
              </svg>
            </div>
          </div>
        </div>
      )
    },
  )

  const LinearSyntenyView = observer(
    ({ model }: { model: LinearSyntenyViewModel }) => {
      return getConf(model, 'middle') ? (
        <MiddleSyntenyView model={model} />
      ) : (
        <OverlaySyntenyView model={model} />
      )
    },
  )

  MiddleSyntenyView.propTypes = {
    model: PropTypes.objectOrObservableObject.isRequired,
  }

  OverlaySyntenyView.propTypes = {
    model: PropTypes.objectOrObservableObject.isRequired,
  }

  LinearSyntenyView.propTypes = {
    model: PropTypes.objectOrObservableObject.isRequired,
  }
  return LinearSyntenyView
}