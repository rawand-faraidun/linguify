import {
	ConflictError,
	LinguifyError,
	NotFoundError,
	toLinguifyError,
	UnexpectedError,
	ValidationError
} from '@linguify/core'
import { describe, expect, it } from 'vitest'

describe('LinguifyError and its classes', () => {
	const error = new NotFoundError('Key "common.cancel" does not exist', {
		code: 'KEY_NOT_FOUND',
		details: { path: 'common.cancel', locale: 'ckb' }
	})

	it('carry their code and details, named for their class', () => {
		expect(error.code).toBe('KEY_NOT_FOUND')
		expect(error.details).toEqual({ path: 'common.cancel', locale: 'ckb' })
		expect(error.name).toBe('NotFoundError')
		expect(String(error.stack)).toMatch(/^NotFoundError: Key/)
	})

	it('are their class, LinguifyError and Error — never a sibling', () => {
		expect(error).toBeInstanceOf(NotFoundError)
		expect(error).toBeInstanceOf(LinguifyError)
		expect(error).toBeInstanceOf(Error)
		expect(error).not.toBeInstanceOf(ConflictError)
		expect(error).not.toBeInstanceOf(ValidationError)
	})

	it('serialize to code, message and details — details only when there are some', () => {
		expect(JSON.parse(JSON.stringify(error))).toEqual({
			code: 'KEY_NOT_FOUND',
			message: 'Key "common.cancel" does not exist',
			details: { path: 'common.cancel', locale: 'ckb' }
		})
		expect(JSON.parse(JSON.stringify(new ConflictError('Files changed on disk', { code: 'STALE_CATALOGUE' })))).toEqual(
			{
				code: 'STALE_CATALOGUE',
				message: 'Files changed on disk'
			}
		)
	})

	it('keep a cause, and have none when given none', () => {
		const root = new Error('EACCES: permission denied')
		expect(new ConflictError('Files changed on disk', { code: 'STALE_CATALOGUE', cause: root }).cause).toBe(root)
		expect('cause' in new NotFoundError('x', { code: 'KEY_NOT_FOUND' })).toBe(false)
	})
})

describe('toLinguifyError', () => {
	it('keeps a LinguifyError as it is', () => {
		const stale = new ConflictError('Files changed on disk', { code: 'STALE_CATALOGUE' })
		expect(toLinguifyError(stale)).toBe(stale)
	})

	it('wraps anything else as UNEXPECTED, keeping it as the cause', () => {
		const root = new Error('EACCES: permission denied')
		const wrapped = toLinguifyError(root)
		expect(wrapped).toBeInstanceOf(UnexpectedError)
		expect([wrapped.code, wrapped.message, wrapped.cause]).toEqual(['UNEXPECTED', 'EACCES: permission denied', root])
	})

	it.each([
		['boom', 'boom'],
		[undefined, 'undefined'],
		[{ message: 'thrown as an object' }, 'thrown as an object'],
		[{ message: 5 }, '[object Object]'],
		[{ other: 1 }, '[object Object]']
	])('takes the message of %j', (thrown, message) => {
		expect(toLinguifyError(thrown).message).toBe(message)
	})
})
