import { FormLabel } from '@material-ui/core'
import FormGroup from '@material-ui/core/FormGroup'
import { withStyles } from '@material-ui/core/styles'
import {
  inject,
  observer,
  PropTypes as MobxPropTypes,
  Provider,
} from 'mobx-react'
import { getMembers } from 'mobx-state-tree'
import propTypes from 'prop-types'
import React from 'react'
import {
  isConfigurationSchemaType,
  isConfigurationSlotType,
  getTypeNamesFromExplicitlyTypedUnion,
} from '../../../configuration/configurationSchema'
import { iterMap } from '../../../util'
import SlotEditor from './SlotEditor'
import TypeSelector from './TypeSelector'

const styles = theme => ({
  root: {
    textAlign: 'left',
    padding: `${theme.spacing.unit}px ${theme.spacing.unit * 3}px ${
      theme.spacing.unit
    }px ${theme.spacing.unit}px`,
    background: theme.palette.background.default,
  },
  subSchemaContainer: {
    marginLeft: theme.spacing.unit,
    borderLeft: `1px solid ${theme.palette.secondary.main}`,
    paddingLeft: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
  },
})

const Member = inject('classes')(
  observer(({ slotName, slotSchema, schema, classes, rootConfig }) => {
    const slot = schema[slotName]
    let typeSelector
    if (isConfigurationSchemaType(slotSchema)) {
      // if (slotName === 'adapter') debugger
      const typeNameChoices = getTypeNamesFromExplicitlyTypedUnion(slotSchema)
      if (typeNameChoices.length) {
        // do something
        typeSelector = (
          <TypeSelector
            typeNameChoices={typeNameChoices}
            slotName={slotName}
            slot={slot}
            onChange={evt => {
              if (evt.target.value !== slot.type)
                schema.setSubschema(slotName, { type: evt.target.value })
            }}
          />
        )
      }
      return (
        <>
          <FormLabel>{slotName}</FormLabel>
          {typeSelector}
          <div className={classes.subSchemaContainer}>
            <FormGroup>
              <Schema rootConfig={rootConfig} schema={slot} />
            </FormGroup>
          </div>
        </>
      )
    }

    if (isConfigurationSlotType(slotSchema)) {
      // this is a regular config slot
      return <SlotEditor key={slotName} slot={slot} slotSchema={slotSchema} />
    }

    return null
  }),
)

const Schema = observer(({ rootConfig, schema }) =>
  iterMap(
    Object.entries(getMembers(schema).properties),
    ([slotName, slotSchema]) => (
      <Member
        key={slotName}
        {...{ slotName, slotSchema, schema, rootConfig }}
      />
    ),
  ),
)

@withStyles(styles)
@observer
class ConfigurationEditor extends React.Component {
  static propTypes = {
    classes: propTypes.shape({
      root: propTypes.string.isRequired,
    }).isRequired,
    model: MobxPropTypes.objectOrObservableObject.isRequired,
  }

  render() {
    const { classes, model } = this.props
    return (
      <Provider model={model} classes={classes}>
        <div className={classes.root}>
          {!model.target ? (
            'no target set'
          ) : (
            <Schema rootConfig={model.target} schema={model.target} />
          )}
        </div>
      </Provider>
    )
  }
}

export default ConfigurationEditor