import type { Catalogue, Report } from '@linguify/types'

/**
 * what an operation that changes translations returns — it never writes; the caller plans and applies
 */
export type OperationResult = {
	/**
	 * the catalogue after the change; the one passed in is left as it was
	 */
	catalogue: Catalogue
	report: Report
}
