import {
	fileClash,
	findKeyPathProblem,
	findNamespaceFileProblem,
	findNamespaceNameProblem,
	findNewNameProblem,
	findProjectKeyPathProblem,
	isWithin,
	joinKeyPath,
	movePath,
	splitKeyPath,
	splitNamespace
} from '@linguify/keys'
import { describe, expect, it } from 'vitest'

describe('splitKeyPath and joinKeyPath', () => {
	it('split a path at its dots and join it back', () => {
		expect(splitKeyPath('common.buttons.save')).toEqual(['common', 'buttons', 'save'])
		expect(joinKeyPath(['common', 'buttons', 'save'])).toBe('common.buttons.save')
	})

	it('keep empty segments, so a problem can be found in them', () => {
		expect(splitKeyPath('common..save')).toEqual(['common', '', 'save'])
	})
})

describe('findKeyPathProblem', () => {
	it.each([
		['common.save', undefined],
		['errors.404', undefined],
		['', 'empty'],
		['common..save', 'empty-segment'],
		['.save', 'empty-segment'],
		['save.', 'empty-segment'],
		['__proto__.x', 'reserved-segment'],
		['a.constructor', 'reserved-segment'],
		['a.prototype.b', 'reserved-segment']
	])('%j → %s', (path, problem) => {
		expect(findKeyPathProblem(path)).toBe(problem)
	})
})

describe('findNamespaceNameProblem', () => {
	it('takes a key path rule, and refuses a dot', () => {
		expect(findNamespaceNameProblem('common')).toBeUndefined()
		expect(findNamespaceNameProblem('')).toBe('empty')
		expect(findNamespaceNameProblem('__proto__')).toBe('reserved-segment')
		expect(findNamespaceNameProblem('common.save')).toBe('separator')
	})
})

describe('findProjectKeyPathProblem', () => {
	it('with namespaces, a path needs a namespace and a name', () => {
		expect(findProjectKeyPathProblem('common', { namespaced: true, nesting: true })).toBe('namespace-only')
		expect(findProjectKeyPathProblem('common.save', { namespaced: true, nesting: true })).toBeUndefined()
		expect(findProjectKeyPathProblem('common.menu.file', { namespaced: true, nesting: true })).toBeUndefined()
	})

	it('a format that cannot nest allows one segment, or two under a namespace', () => {
		expect(findProjectKeyPathProblem('save', { namespaced: false, nesting: false })).toBeUndefined()
		expect(findProjectKeyPathProblem('common.save', { namespaced: false, nesting: false })).toBe('too-deep')
		expect(findProjectKeyPathProblem('common.save', { namespaced: true, nesting: false })).toBeUndefined()
		expect(findProjectKeyPathProblem('common.menu.file', { namespaced: true, nesting: false })).toBe('too-deep')
	})

	it('reports the path rule before the project rule', () => {
		expect(findProjectKeyPathProblem('', { namespaced: true, nesting: false })).toBe('empty')
	})
})

describe('splitNamespace', () => {
	it('parts the first segment from the rest', () => {
		expect(splitNamespace('common.buttons.save')).toEqual({ namespace: 'common', key: 'buttons.save' })
		expect(splitNamespace('common')).toEqual({ namespace: 'common', key: '' })
	})
})

describe('isWithin and movePath', () => {
	it('a path is within itself and its own group, never a sibling sharing its start', () => {
		expect(isWithin('common.save', 'common.save')).toBe(true)
		expect(isWithin('common.save.label', 'common.save')).toBe(true)
		expect(isWithin('common.saved', 'common.save')).toBe(false)
	})

	it('moves a path within the moved one, leaves any other', () => {
		expect(movePath('common.menu.file', 'common.menu', 'home.menu')).toBe('home.menu.file')
		expect(movePath('common', 'common', 'shared')).toBe('shared')
		expect(movePath('common.menus', 'common.menu', 'home.menu')).toBe('common.menus')
	})
})

describe('namespace files', () => {
	it('fileClash finds another differing only in case', () => {
		expect(fileClash('Common', ['common', 'home'])).toBe('common')
		expect(fileClash('common', ['common', 'home'])).toBeUndefined()
	})

	it.each([
		['common', undefined],
		['a/b', 'file-name'],
		['a\\b', 'file-name'],
		['..', 'file-name'],
		['name.', 'file-name'],
		['name ', 'file-name'],
		['CON', 'file-name'],
		['nul', 'file-name'],
		['lpt1', 'file-name'],
		['console', undefined],
		['Home', 'case-clash']
	])('findNamespaceFileProblem(%j) → %s', (name, problem) => {
		expect(findNamespaceFileProblem(name, ['home'])).toBe(problem)
	})
})

describe('findNewNameProblem', () => {
	it('refuses a character a terminal acts on — controls and bidi overrides — and keeps Kurdish Sorani', () => {
		expect(findNewNameProblem('common.save')).toBeUndefined()
		expect(findNewNameProblem('هاوبەش.پاشەکەوتکردن')).toBeUndefined()
		expect(findNewNameProblem('common.\u001b[31m')).toBe('unprintable')
		expect(findNewNameProblem('a\nb')).toBe('unprintable')
		expect(findNewNameProblem('a\u202Eb')).toBe('unprintable')
		expect(findNewNameProblem('a\u2067b')).toBe('unprintable')
	})
})
