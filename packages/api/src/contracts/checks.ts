import type {
	AddKeyInput,
	AddNamespaceInput,
	DiffInput,
	Equal,
	Expect,
	ExportInput,
	InitInput,
	ListKeysInput,
	RemoveKeysInput,
	RemoveNamespaceInput,
	RenameKeyInput,
	RenameNamespaceInput,
	SetKeyInput,
	SyncInput
} from '@linguify/core'
import type { z } from 'zod'
import type { diffInput } from './diff'
import type { initInput } from './init'
import type { exportInput } from './io'
import type { addKeyInput, removeKeysInput, renameKeyInput, setKeyInput } from './key'
import type { listKeysInput } from './list'
import type { addNamespaceInput, removeNamespaceInput, renameNamespaceInput } from './namespace'
import type { syncInput } from './sync'

/**
 * compiles only while every contract parses to exactly the input type core takes
 *
 * @note only inputs core declares are here — core sits below the API and cannot read its contracts, so
 * those are the inputs declared twice. Inputs only the API has (`import`'s, `mutationOptions`) are read
 * off their contracts and never declared again. Equality, not `satisfies`: `satisfies` would let a
 * contract leave out an optional field the type has, and that field could then never reach core. It is
 * also why every optional field of core's input types takes `undefined`: a contract's `.optional()`
 * produces it
 */
export type ContractsMatchInputs = [
	Expect<Equal<z.output<typeof addKeyInput>, AddKeyInput>>,
	Expect<Equal<z.output<typeof setKeyInput>, SetKeyInput>>,
	Expect<Equal<z.output<typeof renameKeyInput>, RenameKeyInput>>,
	Expect<Equal<z.output<typeof removeKeysInput>, RemoveKeysInput>>,
	Expect<Equal<z.output<typeof addNamespaceInput>, AddNamespaceInput>>,
	Expect<Equal<z.output<typeof renameNamespaceInput>, RenameNamespaceInput>>,
	Expect<Equal<z.output<typeof removeNamespaceInput>, RemoveNamespaceInput>>,
	Expect<Equal<z.output<typeof listKeysInput>, ListKeysInput>>,
	Expect<Equal<z.output<typeof diffInput>, DiffInput>>,
	Expect<Equal<z.output<typeof syncInput>, SyncInput>>,
	Expect<Equal<z.output<typeof exportInput>, ExportInput>>,
	Expect<Equal<z.output<typeof initInput>, InitInput>>
]
