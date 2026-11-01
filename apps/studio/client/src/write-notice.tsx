import { useState } from 'react'
import { studioText } from '@linguify/constants'
import { failureText } from '@linguify/table'
import { Button } from '@linguify/ui/components/button'
import { focusRingClass } from './classes'
import { refresh } from './trpc'

/**
 * what a dialog says when its write failed — inside it, as a modal dialog keeps the page's toast out of reach
 * of the pointer and the keyboard: the files changed on disk, or no answer came, each with its own Refresh;
 * any other refusal, with linguify's reason
 *
 * @note after the refresh the dialog's checks run again on what was read, and the same write can be made.
 * A refresh that cannot read the files keeps the notice, and says so
 *
 * @param props - `error`, what the write threw; `onRefreshed`, once the files are read again
 *
 * @returns the notice
 */
export const WriteNotice = ({ error, onRefreshed }: { error: unknown; onRefreshed: () => void }) => {
	const [failed, setFailed] = useState(false)
	const { said, refreshable } = failureText(error)
	return (
		<div role="alert" className="flex items-center gap-2 border border-destructive p-2 text-destructive text-xs">
			<p className="wrap-anywhere flex-1">{failed ? studioText.refreshFailed : said}</p>
			{refreshable && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className={focusRingClass}
					onClick={() =>
						void refresh().then(onRefreshed, () => {
							setFailed(true)
						})
					}
				>
					{studioText.refresh}
				</Button>
			)}
		</div>
	)
}
