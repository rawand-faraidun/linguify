import { writeFileSync } from 'fs'
import { type RequestHandler } from 'express'
import _ from 'lodash'
import { getFileJson, getNamespaceJson, getPath, isNamespaceExists } from '@lib/functions'
import { clear, isAssignable, unflatten } from '@lib/object'
import type { DynamicObject } from '@lib/types'
import { config, otherLocales } from '@lib/utils'
import validate, { S } from '@lib/validation/validate'

/**
 * key body props
 */
type Key = {
  key: string
  value: string
  translations: Record<string, string>
}

/**
 * create key
 */
export const createKey: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const name = ns!
    validate(S.key, req.body, { makeOptional: ['oldKey'] })
    const { key, value, translations } = req.body as Key

    // returning key result
    let result: DynamicObject = { key, value, translations: [] }

    // checking namespace existance
    if (!isNamespaceExists(name)) throw new Error('Namespace does not exist')

    // namespace values
    const defaultJson = getNamespaceJson(config.defaultLocale, name)

    // checking if the key exists or assignable
    if (_.has(defaultJson, key)) throw new Error('Key already exists')
    let assignable = isAssignable(defaultJson, key)
    if (assignable != true) throw new Error(`Point '${assignable}' already exists`)

    // // adding to default language
    const defaultUnflattened = unflatten({ [key]: value })
    if (config.useSingleFile) {
      const file = getFileJson(`${config.defaultLocale}.json`)
      file[name] = _.merge(defaultJson, defaultUnflattened)
      writeFileSync(getPath(`${config.defaultLocale}.json`), JSON.stringify(file))
    } else {
      writeFileSync(getPath(config.defaultLocale, name), JSON.stringify(_.merge(defaultJson, defaultUnflattened)))
    }

    // // adding to other languages
    if (config.useSingleFile) {
      otherLocales.forEach(locale => {
        const file = getFileJson(`${locale}.json`)
        const json = getNamespaceJson(locale, name)
        const unflattened = unflatten({ [key]: translations[locale] || value })
        file[name] = _.merge(json, unflattened)
        writeFileSync(getPath(`${locale}.json`), JSON.stringify(file))
        result.translations.push({ [locale]: value })
      })
    } else {
      otherLocales.forEach(locale => {
        const json = getNamespaceJson(locale, name)
        const unflattened = unflatten({ [key]: translations[locale] || value })
        writeFileSync(getPath(locale, name), JSON.stringify(_.merge(json, unflattened)))
        result.translations.push({ [locale]: value })
      })
    }

    res.status(200).json({
      data: {
        namespace: name,
        key: result
      },
      success: true,
      message: 'Key created successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * update key
 */
export const updateKey: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const name = ns!
    validate(S.key, req.body)
    const { oldKey, key, value, translations } = req.body as Key & { oldKey: string }

    // returning key result
    let result: DynamicObject = { key, value, translations: [] }

    // checking namespace existance
    if (!isNamespaceExists(name)) throw new Error('Namespace does not exist')

    // namespace values
    const defaultJson = getNamespaceJson(config.defaultLocale, name)

    // checking if the edited key exists
    if (!_.has(defaultJson, oldKey)) throw new Error('Key does not exists')

    // removing old key
    let newJson = _.cloneDeep(defaultJson)
    _.unset(newJson, oldKey)
    newJson = clear(newJson)

    // checking if key changed
    if (oldKey != key) {
      // checking if the key assignable
      if (_.has(newJson, key)) throw new Error('New key already exists')
      let assignable = isAssignable(newJson, key)
      if (assignable != true) throw new Error(`Point '${assignable}' already exists`)
    }

    // modifing to default language
    const defaultUnflattened = unflatten({ [key]: value })
    if (config.useSingleFile) {
      const file = getFileJson(`${config.defaultLocale}.json`)
      file[name] = _.merge(newJson, defaultUnflattened)
      writeFileSync(getPath(`${config.defaultLocale}.json`), JSON.stringify(file))
    } else {
      writeFileSync(getPath(config.defaultLocale, name), JSON.stringify(_.merge(newJson, defaultUnflattened)))
    }

    // modifing to other languages
    if (config.useSingleFile) {
      otherLocales.forEach(locale => {
        const file = getFileJson(`${locale}.json`)
        let json = getNamespaceJson(locale, name)
        const unflattened = unflatten({ [key]: translations[locale] || value })
        _.unset(json, oldKey)
        json = clear(json)
        file[name] = _.merge(json, unflattened)
        writeFileSync(getPath(`${locale}.json`), JSON.stringify(file))
        result.translations.push({ [locale]: value })
      })
    } else {
      otherLocales.forEach(locale => {
        let json = getNamespaceJson(locale, name)
        _.unset(json, oldKey)
        json = clear(json)
        const unflattened = unflatten({ [key]: translations[locale] || value })
        writeFileSync(getPath(locale, name), JSON.stringify(_.merge(json, unflattened)))
        result.translations.push({ [locale]: value })
      })
    }

    res.status(200).json({
      data: {
        namespace: name,
        key: result
      },
      success: true,
      message: 'Key updated successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * delete key
 */
export const deleteKeys: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const name = ns!
    const { keys } = req.body as { keys: string[] }
    validate(S.keysStringArray, keys)

    // checking namespace existance
    if (!isNamespaceExists(name)) throw new Error('Namespace does not exist')

    // deleting keys
    if (config.useSingleFile) {
      config.locales.forEach(locale => {
        const file = getFileJson(`${locale}.json`)
        let json = getNamespaceJson(locale, name)
        keys.forEach(k => _.unset(json, k))
        file[name] = clear(json)
        writeFileSync(getPath(`${locale}.json`), JSON.stringify(file))
      })
    } else {
      config.locales.forEach(locale => {
        let json = getNamespaceJson(locale, name)
        keys.forEach(k => _.unset(json, k))
        writeFileSync(getPath(locale, name), JSON.stringify(clear(json)))
      })
    }

    res.status(200).json({
      data: { namespace: name, keys: keys },
      success: true,
      message: 'Keys deleted successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}
