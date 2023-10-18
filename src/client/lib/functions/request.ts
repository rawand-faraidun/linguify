import axios from 'axios'
import { Config, Url } from '../interfaces/Request'

/**
 * http request, using axios
 *
 * @param url - request url
 *
 * @param config - request config
 *
 * @returns axios response
 */
const request = <T = any>(url: Url, { method = 'GET', headers, ...config }: Config = {}) =>
  axios<T>({
    url,
    // @ts-ignore
    baseURL: import.meta.env.PROD ? '' : import.meta.env.VITE_API_URL,
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers
    },
    ...config
  }).catch((err: any) => {
    // customizing error message
    err.originalMessage = err.message
    err.message = err.response?.data?.message
    throw err
  })

export default request
