import { studioText } from '@linguify/constants'
import { Button } from '@linguify/ui/components/button'
import { focusRingClass } from './classes'
import { refresh } from './trpc'

/**
 * what a dialog says when its write was refused because the files changed on disk — with its own Refresh,
 * as a modal dialog keeps the page's toast out of reach of the pointer and the keyboard
 *
 * @note after the refresh the dialog's checks run again on what was read, and the same write can be made
 *
 * @param props - `onRefreshed`, once the files are read again
 *
 * @returns the notice
 */
export const StaleNotice = ({ onRefreshed }: { onRefreshed: () => void }) => (
	<div role="alert" className="flex items-center gap-2 border border-destructive p-2 text-destructive text-xs">
		<p className="flex-1">
			{studioText.staleTitle}. {studioText.staleDescription}
		</p>
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={focusRingClass}
			onClick={() => void refresh().then(onRefreshed)}
		>
			{studioText.refresh}
		</Button>
	</div>
)
