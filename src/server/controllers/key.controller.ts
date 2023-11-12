import { writeFileSync } from 'fs'
import { type RequestHandler } from 'express'
import _ from 'lodash'
import { getNamespaceJson, getPath, isNamespaceExists } from '@lib/functions'
import { clear, isAssignable, unflatten } from '@lib/object'
import type { DynamicObject } from '@lib/types'
import { config, otherLocales } from '@lib/utils'
import validate, { S } from '@lib/validation/validate'

/**
 * create key
 */
export const createKey: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const filename = ns!
    validate(S.key, req.body, { makeOptional: ['oldKey'] })
    const { key, value, translations } = req.body as { key: string; value: string; translations: Record<string, string> }

    // returning key result
    let result: DynamicObject = { key, value, translations: [] }

    // checking namespace existance
    if (!isNamespaceExists(filename)) throw new Error('Namespace does not exist')

    // namespace values
    const defaultJson = getNamespaceJson(config.defaultLocale, filename)

    // checking if the key exists or assignable
    if (_.has(defaultJson, key)) throw new Error('Key already exists')
    let assignable = isAssignable(defaultJson, key)
    if (assignable != true) throw new Error(`Point '${assignable}' already exists`)

    // adding to default language
    const defaultUnflattened = unflatten({ [key]: value })
    writeFileSync(getPath(config.defaultLocale, filename), JSON.stringify(_.merge(defaultJson, defaultUnflattened)))

    // adding to other languages
    otherLocales.forEach(locale => {
      const json = getNamespaceJson(locale, filename)
      const unflattened = unflatten({ [key]: translations[locale] || value })
      writeFileSync(getPath(locale, filename), JSON.stringify(_.merge(json, unflattened)))
      result.translations.push({ [locale]: value })
    })

    res.status(200).json({
      data: {
        namespace: filename,
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
    const filename = ns!
    validate(S.key, req.body)
    const { oldKey, key, value, translations } = req.body as {
      oldKey: string
      key: string
      value: string
      translations: Record<string, string>
    }

    // returning key result
    let result: DynamicObject = { key, value, translations: [] }

    // checking namespace existance
    if (!isNamespaceExists(filename)) throw new Error('Namespace does not exist')

    // namespace values
    const defaultJson = getNamespaceJson(config.defaultLocale, filename)

    // checking if the edited key exists
    if (!_.has(defaultJson, oldKey)) throw new Error('Key does not exists')

    // removing old key
    let newJson = defaultJson
    _.unset(newJson, oldKey)
    newJson = clear(newJson)

    // checking if key changed
    if (oldKey != key) {
      // checking if the key assignable
      if (_.has(newJson, key)) throw new Error('New key already exists')
      let assignable = isAssignable(newJson, key)
      if (assignable != true) throw new Error(`Point '${assignable}' already exists`)
    }

    // adding to default language
    const defaultUnflattened = unflatten({ [key]: value })
    writeFileSync(getPath(config.defaultLocale, filename), JSON.stringify(_.merge(newJson, defaultUnflattened)))

    // adding to other languages
    otherLocales.forEach(locale => {
      let json = getNamespaceJson(locale, filename)
      _.unset(json, oldKey)
      json = clear(json)
      const unflattened = unflatten({ [key]: translations[locale] || value })
      writeFileSync(getPath(locale, filename), JSON.stringify(_.merge(json, unflattened)))
      result.translations.push({ [locale]: value })
    })

    res.status(200).json({
      data: {
        namespace: filename,
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
    const filename = ns!
    const { keys } = req.body as { keys: string[] }
    validate(S.keysStringArray, keys)

    // checking namespace existance
    if (!isNamespaceExists(filename)) throw new Error('Namespace does not exist')

    // deleting keys
    config.locales.forEach(locale => {
      let json = getNamespaceJson(locale, filename)
      keys.forEach(k => _.unset(json, k))
      writeFileSync(getPath(locale, filename), JSON.stringify(clear(json)))
    })

    res.status(200).json({
      data: { namespace: filename, keys: keys },
      success: true,
      message: 'Keys deleted successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}
