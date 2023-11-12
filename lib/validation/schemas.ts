import Joi from 'joi'

/**
 * namespace
 */
export const namespace = Joi.string().required().messages({
  'any.required': 'Namespace is required',
  'string.empty': 'Namespace must not be empty'
})

/**
 * key
 */
export const key = Joi.object().keys({
  oldKey: Joi.string().required().messages({
    'any.required': 'Old key is required',
    'string.empty': 'Old key must not be empty'
  }),
  key: Joi.string().required().messages({
    'any.required': 'Key is required',
    'string.empty': 'Key must not be empty'
  }),
  value: Joi.string().required().messages({
    'any.required': 'Value is required',
    'string.empty': 'Value must not be empty'
  }),
  translations: Joi.object().pattern(/^/, Joi.string().allow('')).messages({
    'any.required': 'Translations is required'
  })
})

/**
 * keys string array
 */
export const keysStringArray = Joi.array().required().items(Joi.string().required()).min(1).messages({
  'any.required': 'Keys string array is required',
  'array.min': 'Keys string array must contain at least one item'
})
