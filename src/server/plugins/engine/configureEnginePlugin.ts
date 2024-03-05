import fs from 'fs'
import path from 'path'
import { plugin } from './plugin'

import {
  loadPreConfiguredForms,
  FormConfiguration
} from './services/configurationService'
import { idFromFilename } from './helpers'
import config from '../../config'

type ConfigureEnginePlugin = (
  formFileName?: string,
  formFilePath?: string
) => {
  plugin: any
  options: {
    modelOptions: {
      relativeTo: string
      previewMode: any
    }
    configs: {
      configuration: any
      id: string
    }[]
    previewMode: boolean
  }
}

const relativeTo = __dirname

type EngineOptions = {
  previewMode?: boolean
}
export const configureEnginePlugin: ConfigureEnginePlugin = (
  formFileName,
  formFilePath,
  options?: EngineOptions
) => {
  let configs: FormConfiguration[]

  if (formFileName && formFilePath) {
    const formConfigPath = path.join(formFilePath, formFileName)

    configs = [
      {
        configuration: JSON.parse(fs.readFileSync(formConfigPath, 'utf8')),
        id: idFromFilename(formFileName)
      }
    ]
  } else {
    configs = loadPreConfiguredForms()
  }

  const modelOptions = {
    relativeTo,
    previewMode: options?.previewMode ?? config.previewMode
  }

  return {
    plugin,
    options: { modelOptions, configs, previewMode: config.previewMode }
  }
}
