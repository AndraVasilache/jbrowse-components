import Divider from '@material-ui/core/Divider'
import Paper from '@material-ui/core/Paper'
import { makeStyles } from '@material-ui/core/styles'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import { observer, PropTypes as MobxPropTypes } from 'mobx-react'
import PropTypes, { element } from 'prop-types'
import React, { useState, useEffect } from 'react'
import BaseFeatureDetail, {
  BaseCard,
  BaseAttributes,
  BaseTranscripts,
} from '@gmod/jbrowse-core/BaseFeatureDrawerWidget/BaseFeatureDetail'
import { async } from 'rxjs/internal/scheduler/async'

const useStyles = makeStyles(theme => ({
  table: {
    padding: 0,
  },
  valueCell: {
    wordWrap: 'break-word',
    padding: theme.spacing(1),
  },
  fieldName: {
    display: 'inline-block',
    minWidth: '90px',
    fontSize: '0.9em',
    borderBottom: '1px solid #0003',
    backgroundColor: '#ddd',
    marginRight: theme.spacing(1),
    padding: theme.spacing(0.5),
  },
  fieldValue: {
    display: 'inline-block',
    fontSize: '0.8em',
  },
  header: {
    padding: theme.spacing(0.5),
    backgroundColor: '#ddd',
  },
  title: {
    fontSize: '1em',
  },

  valbox: {
    border: '1px solid #bbb',
  },
  transcriptId: {
    fontSize: '1.1em',
    borderBottom: '1px solid #0003',
    backgroundColor: '#a6c1cf',
    marginRight: theme.spacing(1),
    padding: theme.spacing(0.5),
    textAlign: 'center',
  },
}))

function VariantFeatureDetails(props) {
  const consequences = []
  const [data, setData] = useState()
  const classes = useStyles()
  const { model } = props
  const feat = JSON.parse(JSON.stringify(model.featureData))
  const { samples, ...rest } = feat
  const { ALT, CHROM, start, end } = feat
  const query = `${CHROM}:${start}:${end}/${ALT[0]}`

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function ensembl() {
      try {
        const response = await fetch(
          `https://rest.ensembl.org/vep/human/region/${query}?content-type=application/json`,
          { signal },
        )
        const content = await response.json()
        setData(content)
      } catch (error) {
        if (!signal.aborted) console.error(error)
      }
    }

    ensembl()
    return () => {
      controller.abort()
    }
  }, [query])

  if (data !== undefined) {
    let array = data[0].transcript_consequences
    if (array !== undefined) {
      array.forEach(elem => {
        const x = {}
        x.transcript_id = elem.transcript_id
        x.consequence_terms = elem.consequence_terms.join(', ')
        x.biotype = elem.biotype
        x.impact = elem.impact
        consequences.push(x)
      })
    } else {
      array = data[0].intergenic_consequences
      if (array !== undefined) {
        array.forEach((elem, index) => {
          const x = {}
          x.intergenic_consequence = index + 1
          x.consequence_terms = elem.consequence_terms.join(', ')
          x.impact = elem.impact
          consequences.push(x)
        })
      }
    }
  }

  // TODO: make table header name visible on hover

  return (
    <Paper className={classes.root} data-testid="variant-side-drawer">
      <BaseCard {...props} title="Consequences">
        {consequences &&
          consequences.map(elem => (
            <div key={elem.transcript_id || elem.intergenic_consequence}>
              <div className={classes.transcriptId}>
                {elem.transcript_id || elem.intergenic_consequence}
              </div>
              <BaseTranscripts feature={elem} {...props} />
            </div>
          ))}
      </BaseCard>
    </Paper>
  )
}

VariantFeatureDetails.propTypes = {
  model: MobxPropTypes.observableObject.isRequired,
}

export default observer(VariantFeatureDetails)
