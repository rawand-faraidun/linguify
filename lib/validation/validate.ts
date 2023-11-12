import Joi from 'joi'
import * as schemas from './schemas'

export { schemas, schemas as S }

/**
 * validate options
 */
type ValidateOptions = Joi.BaseValidationOptions & { returnResult?: boolean; makeOptional?: string[] }

/**
 * validate data
 *
 * validates datas against a Joi schema.
 *
 * @param schema - schema for validation
 * @param data - data to validate
 * @param options - validation options
 *
 * @returns validation result (if returnResult is `true`)
 */
const validate = (schema: Joi.Schema, data: any, options: ValidateOptions = {}) => {
  // making fields optional if it was set
  if (options?.makeOptional && (schema as Joi.ObjectSchema).keys) {
    schema = (schema as Joi.ObjectSchema).keys({
      ...options.makeOptional.reduce((obj, i) => ({ ...obj, [i]: Joi.optional() }), {})
    })
  }

  let res = schema.validate(data, { allowUnknown: true, ...options })
  if (options?.returnResult) return res
  if (res.error) throw res.error
}

export default validate
