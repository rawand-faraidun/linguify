import { useMemo } from 'react'
import { extensionText, studioText } from '@linguify/constants'
import { keyRows, localeOrder } from '@linguify/keys'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from './trpc'

/**
 * the panel: the project's translations, read through the host — one row per key, a column per locale,
 * the default first
 *
 * @returns the panel's content
 */
export const App = () => {
	const trpc = useTRPC()
	const config = useQuery(trpc.config.get.queryOptions())
	const catalogue = useQuery(trpc.catalogue.get.queryOptions())
	const error = config.error ?? catalogue.error
	const source = useMemo(
		() =>
			config.data === undefined
				? undefined
				: {
						locales: config.data.config.locales,
						default: config.data.config.default,
						descriptions: config.data.config.description.enabled
					},
		[config.data]
	)
	if (error !== null) return <p role="alert">{error.data?.linguify?.message ?? error.message}</p>
	if (source === undefined || catalogue.data === undefined) return <p>{extensionText.reading}</p>
	const rows = keyRows(catalogue.data.catalogue, source)
	const locales = localeOrder(source)
	if (rows.length === 0) return <p>{studioText.noKeys}</p>
	return (
		<table id="translations">
			<thead>
				<tr>
					<th scope="col">{extensionText.key}</th>
					{locales.map(locale => (
						<th key={locale} scope="col">
							{locale}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map(row => (
					<tr key={row.key} data-row={row.key}>
						<th scope="row" dir="ltr">
							{row.key}
						</th>
						{locales.map(locale => (
							<td key={locale} lang={locale} dir="auto" data-locale={locale}>
								{row.values[locale]}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}
