import { type ListComponentsDef } from '@defra/forms-model'
import joi from 'joi'

import { SelectionControlField } from '~/src/server/plugins/engine/components/SelectionControlField.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormData,
  type FormSubmissionErrors,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

export class CheckboxesField extends SelectionControlField {
  constructor(def: ListComponentsDef, model: FormModel) {
    super(def, model)

    let schema = joi.array().single().label(def.title.toLowerCase())

    if (def.options.required === false) {
      // null or empty string is valid for optional fields
      schema = schema
        .empty(null)
        .items(joi[this.listType]().allow(...this.values, ''))
    } else {
      schema = schema
        .items(joi[this.listType]().allow(...this.values))
        .required()
    }

    this.formSchema = schema
    this.stateSchema = schema
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    return state[this.name]
      ?.map(
        (value) =>
          this.items.find((item) => `${item.value}` === `${value}`)?.text ?? ''
      )
      .join(', ')
  }

  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors)

    // Handle single (string) or multiple (array) values
    const formDataItems =
      this.name in formData ? [formData[this.name]].flat() : []

    viewModel.items = (viewModel.items ?? []).map((item) => ({
      ...item,
      checked: formDataItems.some((i) => `${item.value}` === i)
    }))

    return viewModel
  }
}
