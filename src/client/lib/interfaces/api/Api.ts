/**
 * page metas
 */
type PageMeta = {
  count: number
  page: number
  perPage: number
  totalPages: number
}

/**
 * get props
 */
export interface GetApi<T = any> {
  data: T
  success: boolean
  message: string
}

/**
 * get list props
 */
export interface ListApi<T = any> extends Omit<GetApi<T>, 'data'> {
  data: T[]
  pageMeta: PageMeta
}

/**
 * post props
 */
export interface PostApi<T = any> {
  data: T
  success: boolean
  message: string
}

/**
 * put props
 */
export interface PutApi<T = any> {
  data: T
  success: boolean
  message: string
}

/**
 * patch props
 */
export interface PatchApi<T = any> {
  data: T
  success: boolean
  message: string
}

/**
 * delete props
 */
export interface DeleteApi<T = any> {
  data: T
  success: boolean
  message: string
}
