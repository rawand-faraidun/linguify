import { readdirSync, renameSync, rmSync, writeFileSync } from 'fs'
import { extname, resolve } from 'path'
import { type RequestHandler } from 'express'
import chalk from 'chalk'
import { config, rootPath } from '@lib/utils'

/**
 * gets namespaces
 */
export const getNamespaces: RequestHandler = (req, res) => {
  try {
    // locale namespaces
    let namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
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
 * create namespace
 */
export const createNamespace: RequestHandler = (req, res) => {
  try {
    const { namespace } = req.body
    const filename = `${namespace}.json`

    // locale namespaces
    let namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
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
    let namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
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
    let namespaces = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
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
