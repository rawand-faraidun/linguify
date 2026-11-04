import {
	assignTranslation,
	compareKeyPaths,
	flattenTree,
	readNode,
	readTranslation,
	removeNode,
	removeNodes,
	setNode,
	setTranslation,
	sortTree,
	unflattenTree
} from '@linguify/keys'
import { describe, expect, it } from 'vitest'

const tree = {
	common: { buttons: { save: 'Save', cancel: 'هەڵوەشاندنەوە' }, empty: {} },
	errors: { '404': 'Not found', '500': 'Oops' },
	home: { title: 'Home' }
}

describe('flattenTree and unflattenTree', () => {
	it('flatten every text to its dotted path, leaving empty groups out', () => {
		expect(flattenTree(tree)).toEqual({
			'common.buttons.save': 'Save',
			'common.buttons.cancel': 'هەڵوەشاندنەوە',
			'errors.404': 'Not found',
			'errors.500': 'Oops',
			'home.title': 'Home'
		})
	})

	it('round trip to the tree without its empty group, numeric segments still object keys, order kept', () => {
		const back = unflattenTree(flattenTree(tree))
		expect(back).toEqual({
			common: { buttons: { save: 'Save', cancel: 'هەڵوەشاندنەوە' } },
			errors: { '404': 'Not found', '500': 'Oops' },
			home: { title: 'Home' }
		})
		expect(Array.isArray(back.errors)).toBe(false)
		expect(Object.keys(back)).toEqual(['common', 'errors', 'home'])
	})
})

describe('readNode and readTranslation', () => {
	it('read a text, a group, or nothing — never an inherited property', () => {
		expect(readTranslation(tree, 'common.buttons.save')).toBe('Save')
		expect(readNode(tree, 'common.buttons')).toEqual({ save: 'Save', cancel: 'هەڵوەشاندنەوە' })
		expect(readTranslation(tree, 'common.buttons')).toBeUndefined()
		expect(readNode(tree, 'common.buttons.save.label')).toBeUndefined()
		expect(readNode(tree, 'toString')).toBeUndefined()
		expect(readNode(tree, 'common.hasOwnProperty')).toBeUndefined()
	})
})

describe('setNode and setTranslation', () => {
	it('set a text, making the groups on the way, without changing the tree given', () => {
		const before = structuredClone(tree)
		expect(setTranslation(tree, 'home.menu.file', 'File').home).toEqual({ title: 'Home', menu: { file: 'File' } })
		expect(tree).toEqual(before)
	})

	it('refuse to nest under a text, or to replace a group with one', () => {
		expect(() => setNode(tree, 'home.title.x', 'x')).toThrow(TypeError)
		expect(() => setTranslation(tree, 'common.buttons', 'x')).toThrow(TypeError)
	})
})

describe('removeNode and removeNodes', () => {
	it('remove a key and drop groups left empty, the namespace too unless kept', () => {
		expect(removeNode({ ns: { deep: { k: 'v' } } }, 'ns.deep.k')).toEqual({})
		expect(removeNode({ ns: { deep: { k: 'v' } } }, 'ns.deep.k', { keepTopLevel: true })).toEqual({ ns: {} })
	})

	it('return the same tree when nothing is there to remove', () => {
		expect(removeNode(tree, 'nope.key')).toBe(tree)
		expect(removeNode(tree, 'home.title.deeper')).toBe(tree)
		expect(removeNodes(tree, ['nope', 'home.nope'])).toBe(tree)
	})

	it('remove many at once — a path under one also removed counts once', () => {
		expect(
			removeNodes({ common: { save: 'Save', menu: { file: 'File', edit: 'Edit' } }, home: { title: 'Home' } }, [
				'common.menu',
				'common.menu.file',
				'home.title'
			])
		).toEqual({ common: { save: 'Save' } })
		expect(removeNodes({ a: { b: 'x' }, c: 'y' }, ['a.b'], { keepTopLevel: true })).toEqual({ a: {}, c: 'y' })
	})
})

describe('assignTranslation', () => {
	it('writes in place, a `__proto__` segment an own key that pollutes nothing', () => {
		const target = {}
		assignTranslation(target, '__proto__.polluted', 'yes')
		expect(Object.hasOwn(target, '__proto__')).toBe(true)
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})

	it('refuses to nest under a text, or to replace a group', () => {
		expect(() => assignTranslation({ a: 'x' }, 'a.b', 'y')).toThrow(TypeError)
		expect(() => assignTranslation({ a: { b: 'x' } }, 'a', 'y')).toThrow(TypeError)
	})
})

describe('sortTree and compareKeyPaths', () => {
	it('sort collated, numerically and deep, without touching the tree given', () => {
		const unsorted = { b: { z: '1', a: '2' }, a: 'x', B: 'y', item10: 'i', item2: 'j' }
		expect(Object.keys(sortTree(unsorted))).toEqual(['a', 'b', 'B', 'item2', 'item10'])
		expect(Object.keys(sortTree(unsorted).b as object)).toEqual(['a', 'z'])
		expect(Object.keys(unsorted)).toEqual(['b', 'a', 'B', 'item10', 'item2'])
	})

	it('keep a `__proto__` key from JSON a plain own key', () => {
		const sorted = sortTree(JSON.parse('{"__proto__": {"polluted": "yes"}, "ok": "fine"}'))
		expect(Object.hasOwn(sorted, '__proto__')).toBe(true)
		expect(Object.getPrototypeOf(sorted)).toBe(Object.prototype)
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})

	it('order paths segment by segment, a group before its keys', () => {
		const paths = ['common.save', 'common', 'b.item10', 'b.item2', 'a.z']
		expect(paths.sort(compareKeyPaths)).toEqual(['a.z', 'b.item2', 'b.item10', 'common', 'common.save'])
	})
})
