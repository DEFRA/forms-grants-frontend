import {
  ComponentType,
  type FormDefinition,
  type TextFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('TextField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: TextFieldComponent
    let collection: ComponentCollection
    let component: FormComponentFieldClass

    beforeEach(() => {
      def = {
        title: 'Example text field',
        name: 'myComponent',
        type: ComponentType.TextField,
        options: {},
        schema: {}
      } satisfies TextFieldComponent

      collection = new ComponentCollection([def], { model: formModel })
      component = collection.formItems[0]
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'example text field'
            })
          })
        )
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              presence: 'required'
            })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [{ ...def, options: { required: false } }],
          { model: formModel }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({ allow: [''] })
        )

        const result = collectionOptional.validate(getFormData(''))
        expect(result.errors).toBeUndefined()
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(getFormData('Text'))
        const result2 = collection.validate(getFormData('Text field'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example text field'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData(['invalid']))
        const result2 = collection.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState('Text field')
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('Text field')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('Text field')
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('Text field'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('Text field')
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe('Text field')
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('Text field')
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('Text field'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(getFormData('Text field'))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'Text field'
          })
        )
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: getFormData('  Leading spaces'),
            output: { value: getFormData('Leading spaces') }
          },
          {
            input: getFormData('Trailing spaces  '),
            output: { value: getFormData('Trailing spaces') }
          },
          {
            input: getFormData('  Mixed spaces and new lines \n\n'),
            output: { value: getFormData('Mixed spaces and new lines') }
          }
        ]
      },
      {
        description: 'Schema min and max',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {
            min: 5,
            max: 8
          }
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: getFormData('Text'),
            output: {
              value: getFormData('Text'),
              errors: [
                expect.objectContaining({
                  text: 'Example text field must be 5 characters or more'
                })
              ]
            }
          },
          {
            input: getFormData('Text field'),
            output: {
              value: getFormData('Text field'),
              errors: [
                expect.objectContaining({
                  text: 'Example text field must be 8 characters or less'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema length',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {
            length: 4
          }
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: getFormData('Text'),
            output: { value: getFormData('Text') }
          },
          {
            input: getFormData('Text field'),
            output: {
              value: getFormData('Text field'),
              errors: [
                expect.objectContaining({
                  text: 'Example text field length must be 4 characters long'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema regex',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {
            regex: '^[a-zA-Z]{1,2}\\d[a-zA-Z\\d]?\\s?\\d[a-zA-Z]{2}$'
          }
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: getFormData('SW1P'),
            output: {
              value: getFormData('SW1P'),
              errors: [
                expect.objectContaining({
                  text: 'Enter a valid example text field'
                })
              ]
            }
          },
          {
            input: getFormData('SW1P 4DF'),
            output: { value: getFormData('SW1P 4DF') }
          }
        ]
      },
      {
        description: 'Custom validation',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            customValidationMessage: 'This is a custom error'
          },
          schema: {}
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: getFormData(''),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            required: false
          },
          schema: {}
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: getFormData(''),
            output: { value: getFormData('') }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let collection: ComponentCollection

      beforeEach(() => {
        collection = new ComponentCollection([def], { model: formModel })
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const result = collection.validate(input)
          expect(result).toEqual(output)
        }
      )
    })
  })
})
