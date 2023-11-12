import { AxiosRequestConfig } from 'axios'

/**
 * request methods
 */
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

/**
 * request url parameter
 */
export type Url = string

/**
 * request config
 */
export type Config = Omit<AxiosRequestConfig, 'url'> & {
  /**
   * request method
   */
  method?: Method
}
