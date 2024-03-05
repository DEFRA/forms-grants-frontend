import type { InitialiseSessionOptions } from '../../plugins/initialiseSession/types'

/**
 * FormSubmissionState is an object containing the following props:
 * 1. progress[]: which indicates the urls the user have already submitted.
 * 2. Other props containing user's submitted values as `{ [inputId]: value }` or as `{ [sectionName]: { [inputName]: value } }`
 *   a) . e.g:
 * ```ts
 *     {
 *       progress: [
 *         '/gZovGvanSq/student-visa-application?visit=HxCva29Xhd',
 *         '/gZovGvanSq/what-are-you-going-to-study?visit=HxCva29Xhd'
 *       ],
 *       _C9PRHmsgt: 'Ben',
 *       WfLk9McjzX: 'Music',
 *       IK7jkUFCBL: 'Royal Academy of Music'
 *     }
 * ```
 *
 *   b)
 * ```ts
 *   {
 *         progress: [
 *           '/gZovGvanSq/uk-passport?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/how-many-people?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/applicant-one?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/applicant-one-address?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/contact-details?visit=pQ1LIzb5kE'
 *         ],
 *         checkBeforeYouStart: { ukPassport: true },
 *         applicantDetails: {
 *           numberOfApplicants: 1,
 *           phoneNumber: '77777777',
 *           emailAddress: 'aaa@aaa.com'
 *         },
 *         applicantOneDetails: {
 *           firstName: 'a',
 *           middleName: 'a',
 *           lastName: 'a',
 *           address: { addressLine1: 'a', addressLine2: 'a', town: 'a', postcode: 'a' }
 *         }
 *     }
 * ```
 */
export type FormSubmissionState = {
  progress?: string[]
  [propName: string]: any
  callback?: InitialiseSessionOptions
}

export type FormSubmissionErrors = {
  titleText: string // e.b: "Fix the following errors"
  errorList: {
    path: string // e.g: "firstName"
    href: string // e.g: "#firstName"
    name: string // e.g: "firstName"
    text: string // e.g: '"First name" is not allowed to be empty'
  }[]
}

export type FormPayload = {
  crumb: string // An ID generated by crumb plugin, used for Cross-Site Request Forgery protection, which is addded as a hidden input to the form.
  [k: string]: any // the list of values [{ [inputNameOrID]: value }, ...] posted with the form in every page submission.
}

export type FormData = {
  lang?: string // form language e.g: "en"
  value?: FormPayload
  errors?: FormSubmissionErrors | null
}

export type CookiesPolicy = {
  isSet: boolean
  essential: boolean
  analytics: 'on' | 'off'
  usage: boolean
}
