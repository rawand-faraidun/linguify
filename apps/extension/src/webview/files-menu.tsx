import { bridgeCommandType, fileMenuActions, projectActionText, studioText } from '@linguify/constants'
import type { BridgeCommand } from '@linguify/types'
import { vscode } from './page'
import { closePopover, Popover } from './popover'

/**
 * the Files menu: sync and format, as the studio's — each run by the host for this panel's project, which
 * shows what it will change and asks first in the editor's own modal, then has the panel read the files again
 *
 * @returns the menu
 */
export const FilesMenu = () => (
	<Popover id="files-menu" label={studioText.files} align="end">
		<ul className="flex flex-col">
			{fileMenuActions.map(action => (
				<li key={action}>
					<button
						type="button"
						className="w-full rounded-sm px-2 py-1 text-start hover:bg-hover"
						onClick={event => {
							const asked: BridgeCommand = { type: bridgeCommandType, command: action }
							vscode.postMessage(asked)
							closePopover(event.currentTarget)
						}}
					>
						{projectActionText[action].label}
					</button>
				</li>
			))}
		</ul>
	</Popover>
)
