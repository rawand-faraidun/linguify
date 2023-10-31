import { readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { extname, resolve } from 'path'
import { type RequestHandler } from 'express'
import { flatten } from '@lib/object'
import type { DynamicObject } from '@lib/types'
import { config, otherLanguages, rootPath } from '@lib/utils'

/**
 * gets namespaces
 */
export const getNamespaces: RequestHandler = (req, res) => {
  try {
    // locale namespaces
    const namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

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
    const filename = ns!

    // locale namespaces
    const namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

    // checking namespace existance
    if (!namespaces.map(ns => ns.toLowerCase()).includes(filename.toLowerCase())) throw new Error('Namespace does not exist')

    // each namespace values
    const values: DynamicObject = {}
    // each namespace flattened values
    const flattened: DynamicObject = {}
    // flattened values array
    const flattenValues: DynamicObject[] = []

    // reading namespace values from each locale
    config.locales.forEach(locale => {
      const path = resolve(rootPath, config.localesPath, locale, filename)
      const file = readFileSync(path, 'utf-8')
      const value = JSON.parse(file) || {}
      values[locale] = value
      flattened[locale] = flatten(value)
    })

    // making flattened values array
    Object.entries(flattened[config.defaultLocale]).forEach(([key, value]) => {
      const translations = otherLanguages.reduce((obj, locale) => {
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
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

/**
 * create namespace
 */
export const createNamespace: RequestHandler = (req, res) => {
  try {
    const { namespace } = req.body
    const filename = `${namespace}.json`

    // locale namespaces
    const namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

    // checking namespace existance
    if (namespaces.map(ns => ns.toLowerCase()).includes(filename.toLowerCase())) throw new Error('Namespace already exists')

    // creating the namespace
    config.locales.forEach(locale => {
      const path = resolve(rootPath, config.localesPath, locale, filename)
      writeFileSync(path, '{}')
    })

    res.status(200).json({
      data: { namespace: filename },
      success: true,
      message: 'Namespaces created successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

/**
 * update namespace
 */
export const updateNamespace: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    const oldFilename = ns!
    const { namespace } = req.body
    const filename = `${namespace}.json`

    // locale namespaces
    const namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

    // checking namespace existance
    if (!namespaces.map(n => n.toLowerCase()).includes(oldFilename.toLowerCase())) {
      throw new Error('Namespace does not exist')
    }

    // checking new namespace existance
    if (namespaces.map(ns => ns.toLowerCase()).includes(filename.toLowerCase())) throw new Error('Namespace already exists')

    // renaming the namespace
    config.locales.forEach(locale => {
      const oldPath = resolve(rootPath, config.localesPath, locale, oldFilename)
      const path = resolve(rootPath, config.localesPath, locale, filename)
      renameSync(oldPath, path)
    })

    res.status(200).json({
      data: { namespace: filename, oldNamespace: oldFilename },
      success: true,
      message: 'Namespaces updated successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

/**
 * delete namespace
 */
export const deleteNamespace: RequestHandler = (req, res) => {
  try {
    const { ns } = req.params
    const filename = ns!

    // locale namespaces
    const namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

    // checking namespace existance
    if (!namespaces.map(ns => ns.toLowerCase()).includes(filename.toLowerCase())) throw new Error('Namespace does not exist')

    // creating the namespace
    config.locales.forEach(locale => {
      const path = resolve(rootPath, config.localesPath, locale, filename)
      rmSync(path)
    })

    res.status(200).json({
      data: { namespace: filename },
      success: true,
      message: 'Namespaces deleted successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
