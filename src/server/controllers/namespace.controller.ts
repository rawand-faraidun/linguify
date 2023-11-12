import { renameSync, rmSync, writeFileSync } from 'fs'
import { type RequestHandler } from 'express'
import { getNamespaces as getConfigNamespaces, getNamespaceJson, getPath, isNamespaceExists } from '@lib/functions'
import { flatten } from '@lib/object'
import type { DynamicObject } from '@lib/types'
import { config, otherLocales } from '@lib/utils'
import validate, { S } from '@lib/validation/validate'

/**
 * gets namespaces
 */
export const getNamespaces: RequestHandler = (req, res) => {
  try {
    // locale namespaces
    const namespaces = getConfigNamespaces()

    res.status(200).json({
      data: namespaces,
      success: true,
      message: 'Namespaces retrieved successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

/**
 * gets namespace
 */
export const getNamespace: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const filename = ns!

    // checking namespace existance
    if (!isNamespaceExists(filename)) throw new Error('Namespace does not exist')

    // each namespace values
    const values: DynamicObject = {}
    // each namespace flattened values
    const flattened: DynamicObject = {}
    // flattened values array
    const flattenValues: DynamicObject[] = []

    // reading namespace values from each locale
    config.locales.forEach(locale => {
      const value = getNamespaceJson(locale, filename)
      values[locale] = value
      flattened[locale] = flatten(value)
    })

    // making flattened values array
    Object.entries(flattened[config.defaultLocale]).forEach(([key, value]) => {
      const translations = otherLocales.reduce((obj, locale) => {
        return { ...obj, [locale]: flattened[locale][key] }
      }, {})
      flattenValues.push({ key, value, translations })
    })

    res.status(200).json({
      data: {
        namespace: filename,
        values,
        flatten: flattened,
        flattenValues
      },
      success: true,
      message: 'Namespace retrieved successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * create namespace
 */
export const createNamespace: RequestHandler = (req, res) => {
  try {
    const { namespace } = req.body
    validate(S.namespace, namespace)
    const filename = `${namespace}.json`

    // checking namespace existance
    if (isNamespaceExists(filename)) throw new Error('Namespace already exists')

    // creating the namespace
    config.locales.forEach(locale => writeFileSync(getPath(locale, filename), '{}'))

    res.status(200).json({
      data: { namespace: filename },
      success: true,
      message: 'Namespaces created successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * update namespace
 */
export const updateNamespace: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const { namespace } = req.body
    validate(S.namespace, namespace)
    const oldFilename = ns!
    const filename = `${namespace}.json`

    // checking namespace existance
    if (!isNamespaceExists(oldFilename)) throw new Error('Namespace does not exist')

    // checking new namespace existance
    if (isNamespaceExists(filename)) throw new Error('Namespace already exists')

    // renaming the namespace
    config.locales.forEach(locale => renameSync(getPath(locale, oldFilename), getPath(locale, filename)))

    res.status(200).json({
      data: { namespace: filename, oldNamespace: oldFilename },
      success: true,
      message: 'Namespaces updated successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * delete namespace
 */
export const deleteNamespace: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    validate(S.namespace, ns)
    const filename = ns!

    // checking namespace existance
    if (!isNamespaceExists(filename)) throw new Error('Namespace does not exist')

    // creating the namespace
    config.locales.forEach(locale => rmSync(getPath(locale, filename)))

    res.status(200).json({
      data: { namespace: filename },
      success: true,
      message: 'Namespaces deleted successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}
