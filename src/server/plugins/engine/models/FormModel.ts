import {
  clone,
  ConditionsModel,
  formDefinitionSchema,
  type ConditionRawData,
  type FormDefinition,
  type List,
  type Page
} from '@defra/forms-model'
import { add } from 'date-fns'
import { Parser } from 'expr-eval'
import joi from 'joi'

import { ComponentCollection } from '~/src/server/plugins/engine/components/index.js'
import { DEFAULT_FEE_OPTIONS } from '~/src/server/plugins/engine/models/FormModel.feeOptions.js'
import { type ExecutableCondition } from '~/src/server/plugins/engine/models/types.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  PageControllerBase,
  getPageController
} from '~/src/server/plugins/engine/pageControllers/index.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'

class EvaluationContext {
  constructor(conditions, value) {
    Object.assign(this, value)

    for (const key in conditions) {
      Object.defineProperty(this, key, {
        get() {
          return conditions[key].fn(value)
        }
      })
    }
  }
}

export class FormModel {
  /**
   * Responsible for instantiating the {@link PageControllerBase} and {@link EvaluationContext} from a form JSON
   */

  /** the entire form JSON as an object */
  def: FormDefinition

  lists: FormDefinition['lists']
  sections: FormDefinition['sections'] = []
  options: any
  name: any
  values: any
  DefaultPageController: any = PageController
  /** the id of the form used for the first url parameter eg localhost:3009/test */
  basePath: string
  conditions: Record<string, ExecutableCondition> | object
  fieldsForContext: ComponentCollection
  fieldsForPrePopulation: Record<string, any>
  pages: any
  startPage: any

  feeOptions?: FormDefinition['feeOptions']
  specialPages?: FormDefinition['specialPages']

  constructor(def: FormDefinition, options) {
    const result = formDefinitionSchema.validate(def, { abortEarly: false })

    if (result.error) {
      throw result.error
    }

    // Make a clone of the shallow copy returned
    // by joi so as not to change the source data.
    def = clone(result.value)

    // Add default lists
    def.lists.push({
      name: '__yesNo',
      title: 'Yes/No',
      type: 'boolean',
      items: [
        {
          text: 'Yes',
          value: true
        },
        {
          text: 'No',
          value: false
        }
      ]
    })

    this.def = def
    this.lists = def.lists
    this.sections = def.sections
    this.options = options
    this.name = def.name
    this.values = result.value

    if (options.defaultPageController) {
      this.DefaultPageController = getPageController(
        options.defaultPageController
      )
    }

    this.basePath = options.basePath

    this.conditions = {}
    def.conditions.forEach((conditionDef) => {
      const condition = this.makeCondition(conditionDef)
      this.conditions[condition.name] = condition
    })

    const exposedComponentDefs = def.pages.flatMap(({ components = [] }) => {
      return components.filter(({ options }) => {
        return 'exposeToContext' in options && options.exposeToContext
      })
    })

    this.fieldsForContext = new ComponentCollection(exposedComponentDefs, this)
    this.fieldsForPrePopulation = {}
    this.pages = def.pages.map((pageDef) => this.makePage(pageDef))
    this.startPage = this.pages.find((page) => page.path === def.startPage)
    this.specialPages = def.specialPages
    this.feeOptions = { ...DEFAULT_FEE_OPTIONS, ...def.feeOptions }
  }

  /**
   * build the entire model schema from individual pages/sections
   */
  makeSchema(state: FormSubmissionState) {
    return this.makeFilteredSchema(state, this.pages)
  }

  /**
   * build the entire model schema from individual pages/sections and filter out answers
   * for pages which are no longer accessible due to an answer that has been changed
   */
  makeFilteredSchema(_state: FormSubmissionState, relevantPages) {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = joi.object().required()
    ;[undefined, ...this.sections].forEach((section) => {
      const sectionPages = relevantPages.filter(
        (page) => page.section === section
      )

      if (sectionPages.length > 0) {
        if (section) {
          const isRepeatable = sectionPages.find(
            (page) => page.pageDef.repeatField
          )

          let sectionSchema: joi.ObjectSchema | joi.ArraySchema = joi
            .object()
            .required()

          sectionPages.forEach((sectionPage) => {
            sectionSchema = sectionSchema.concat(sectionPage.stateSchema)
          })

          if (isRepeatable) {
            sectionSchema = joi.array().items(sectionSchema)
          }

          schema = schema.append({
            [section.name]: sectionSchema
          })
        } else {
          sectionPages.forEach((sectionPage) => {
            schema = schema.concat(sectionPage.stateSchema)
          })
        }
      }
    })

    return schema
  }

  /**
   * instantiates a Page based on {@link Page}
   */
  makePage(pageDef: Page) {
    if (pageDef.controller) {
      const PageController = getPageController(pageDef.controller)

      if (!PageController) {
        throw new Error(`PageController for ${pageDef.controller} not found`)
      }

      return new PageController(this, pageDef)
    }

    if (this.DefaultPageController) {
      const DefaultPageController = this.DefaultPageController
      return new DefaultPageController(this, pageDef)
    }

    return new PageControllerBase(this, pageDef)
  }

  /**
   * Instantiates a Condition based on {@link ConditionRawData}
   * @param condition
   */
  makeCondition(condition: ConditionRawData) {
    const parser = new Parser({
      operators: {
        logical: true
      }
    })

    parser.functions.dateForComparison = function (timePeriod, timeUnit) {
      return add(new Date(), { [timeUnit]: timePeriod }).toISOString()
    }

    /**
     * TODO:- this is most definitely broken.
     */
    parser.functions.timeForComparison = function (timePeriod, timeUnit) {
      const offsetTime = add(Number(timePeriod), timeUnit)
      return `${offsetTime.getHours()}:${offsetTime.getMinutes()}`
    }

    const { name, value } = condition
    const expr = this.toConditionExpression(value, parser)

    const fn = (value) => {
      const ctx = new EvaluationContext(this.conditions, value)
      try {
        return expr.evaluate(ctx)
      } catch (err) {
        return false
      }
    }

    return {
      name,
      value,
      expr,
      fn
    }
  }

  toConditionExpression(value, parser) {
    if (typeof value === 'string') {
      return parser.parse(value)
    }

    const conditions = ConditionsModel.from(value)
    return parser.parse(conditions.toExpression())
  }

  get conditionOptions() {
    return { allowUnknown: true, presence: 'required' }
  }

  getList(name: string): List | [] {
    return this.lists.find((list) => list.name === name) ?? []
  }

  getContextState(state: FormSubmissionState) {
    const contextState = Object.keys(state).reduce((acc, curr) => {
      if (typeof state[curr] === 'object') {
        return {
          ...acc,
          ...state[curr]
        }
      }
      return {
        ...acc,
        [curr]: state[curr]
      }
    }, {})

    return this.fieldsForContext.getFormDataFromState(contextState)
  }
}
