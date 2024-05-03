import { type InputFieldsComponentsDef } from '@defra/forms-model'
import { format, parse, parseISO } from 'date-fns'
import { Schema } from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { optionalText } from '~/src/server/plugins/engine/components/constants.js'
import * as helpers from '~/src/server/plugins/engine/components/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormPayload,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class DateTimePartsField extends FormComponent {
  children: ComponentCollection

  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model)
    const { name } = this
    const options: any = this.options

    this.children = new ComponentCollection(
      [
        {
          type: 'NumberField',
          name: `${name}__day`,
          title: 'Day',
          schema: { min: 1, max: 31 },
          options: {
            required: options.required,
            classes: 'govuk-input--width-2'
          }
        },
        {
          type: 'NumberField',
          name: `${name}__month`,
          title: 'Month',
          schema: { min: 1, max: 12 },
          options: {
            required: options.required,
            classes: 'govuk-input--width-2'
          }
        },
        {
          type: 'NumberField',
          name: `${name}__year`,
          title: 'Year',
          schema: { min: 1000, max: 3000 },
          options: {
            required: options.required,
            classes: 'govuk-input--width-4'
          }
        },
        {
          type: 'NumberField',
          name: `${name}__hour`,
          title: 'Hour',
          schema: { min: 0, max: 23 },
          options: {
            required: options.required,
            classes: 'govuk-input--width-2'
          }
        },
        {
          type: 'NumberField',
          name: `${name}__minute`,
          title: 'Minute',
          schema: { min: 0, max: 59 },
          options: {
            required: options.required,
            classes: 'govuk-input--width-2'
          }
        }
      ] as any,
      model
    )

    this.stateSchema = helpers.buildStateSchema('date', this)
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys()
  }

  getStateSchemaKeys() {
    return { [this.name]: this.stateSchema! }
  }

  getFormDataFromState(state: FormSubmissionState) {
    const name = this.name
    const value =
      typeof state[name] === 'string' ? new Date(state[name]) : state[name]
    return {
      [`${name}__day`]: value?.getDate(),
      [`${name}__month`]: value && value.getMonth() + 1,
      [`${name}__year`]: value?.getFullYear(),
      [`${name}__hour`]: value?.getHours(),
      [`${name}__minute`]: value?.getMinutes()
    }
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const name = this.name
    // Use `date-fns` to parse the date as
    // opposed to the Date constructor.
    // `date-fns` will check a string is a valid date.
    // E.g. 31 November is not a valid date
    const date = this.constructDateString(
      payload[`${name}__year`],
      payload[`${name}__month`],
      payload[`${name}__day`],
      payload[`${name}__hour`],
      payload[`${name}__minute`]
    )
    return payload[`${name}__year`] ? date : null
  }

  constructDateString(
    year: string,
    month: string,
    day: string,
    hour: string,
    minute: string
  ) {
    return parse(
      `${year}/${month}/${day} ${hour}:${minute}`,
      'yyyy/MM/dd HH:mm',
      new Date()
    )
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const name = this.name
    const value = state[name]
    return value ? format(parseISO(value), 'd MMMM yyyy h:mm') : ''
  }

  // @ts-expect-error - Property 'getViewModel' in type 'DateTimePartsField' is not assignable to the same property in base type 'FormComponent'
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors)

    // Use the component collection to generate the subitems
    const componentViewModels = this.children
      .getViewModel(formData, errors)
      .map((vm) => vm.model)

    componentViewModels.forEach((componentViewModel) => {
      // Nunjucks macro expects label to be a string for this component
      componentViewModel.label = componentViewModel.label?.text?.replace(
        optionalText,
        ''
      ) as any

      if (componentViewModel.errorMessage) {
        componentViewModel.classes += ' govuk-input--error'
      }
    })

    return {
      ...viewModel,
      fieldset: {
        legend: viewModel.label
      },
      items: componentViewModels
    }
  }
}
