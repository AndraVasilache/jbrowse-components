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
}))

function VariantSamples(props) {
  const classes = useStyles()
  const { feature } = props
  if (!feature.samples) {
    return null
  }
  const ret = Object.keys(feature.samples)
  if (!ret.length) {
    return null
  }
  const infoFields = Object.keys(feature.samples[ret[0]])

  return (
    <BaseCard {...props} title="Samples">
      <div style={{ width: '100%', maxHeight: 600, overflow: 'auto' }}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>Sample</TableCell>
              {infoFields.map(f => (
                <TableCell key={f}>{f}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(feature.samples).map(
              ([key, value]) =>
                value && (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row">
                      {key}
                    </TableCell>
                    {infoFields.map(f => (
                      <TableCell className={classes.valueCell} key={f}>
                        {String(value[f])}
                      </TableCell>
                    ))}
                  </TableRow>
                ),
            )}
          </TableBody>
        </Table>
      </div>
    </BaseCard>
  )
}

VariantSamples.propTypes = {
  feature: PropTypes.shape().isRequired,
}

function VariantFeatureDetails(props) {
  const consequences = []
  const [data, setData] = useState()
  const classes = useStyles()
  const { model } = props
  const feat = JSON.parse(JSON.stringify(model.featureData))
  const { samples, ...rest } = feat
  const { ALT, CHROM, start, end } = feat
  //const query = `${CHROM}:${start}:${end}/${ALT[0]}`
  const query = "1:6524705:6524705/T"

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
    const array = data[0].transcript_consequences
    array.forEach(arrayItem => {
      let x = new Object()

      if (arrayItem.consequence_terms !== undefined) {
        x.consequence_terms = arrayItem.consequence_terms
      }

      if (arrayItem.biotype !== undefined) {
        x.biotype = arrayItem.biotype
      }

      if (arrayItem.variant_allele !== undefined) {
        x.variant_allele = arrayItem.variant_allele
      }
      consequences.push(x)
    })
  }

  return (
    <Paper className={classes.root} data-testid="variant-side-drawer">
      <BaseFeatureDetail feature={rest} {...props} />
      <Divider />
      <VariantSamples feature={feat} {...props} />
      <Divider />
      <BaseCard {...props} title="Consequences">
        {consequences &&
          consequences.map(elem => (
            <>
              {' '}
              <BaseTranscripts feature={elem} {...props} /> <Divider />{' '}
            </>
          ))}
      </BaseCard>
    </Paper>
  )
}

VariantFeatureDetails.propTypes = {
  model: MobxPropTypes.observableObject.isRequired,
}

export default observer(VariantFeatureDetails)
