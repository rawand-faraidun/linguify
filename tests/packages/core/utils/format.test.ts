import { formatJson } from '@linguify/core'
import { describe, expect, it } from 'vitest'

const tree = { common: { save: 'Save', cancel: 'هەڵوەشاندنەوە' }, z: 'last', a: 'first' }

describe('formatJson', () => {
	it('indents with spaces, ending in a newline when asked', () => {
		expect(formatJson(tree, { indentation: 2, indentationStyle: 'space', finalNewline: true })).toBe(
			'{\n  "common": {\n    "save": "Save",\n    "cancel": "هەڵوەشاندنەوە"\n  },\n  "z": "last",\n  "a": "first"\n}\n'
		)
		expect(formatJson({ a: { b: 'c' } }, { indentation: 4, indentationStyle: 'space', finalNewline: false })).toBe(
			'{\n    "a": {\n        "b": "c"\n    }\n}'
		)
	})

	it('indents one tab per level, whatever the width', () => {
		expect(formatJson({ a: { b: 'c' } }, { indentation: 4, indentationStyle: 'tab', finalNewline: false })).toBe(
			'{\n\t"a": {\n\t\t"b": "c"\n\t}\n}'
		)
	})

	it('writes one line for an indentation of 0, tabs or not', () => {
		expect(formatJson(tree, { indentation: 0, indentationStyle: 'space', finalNewline: false })).toBe(
			'{"common":{"save":"Save","cancel":"هەڵوەشاندنەوە"},"z":"last","a":"first"}'
		)
		expect(formatJson({ a: 'b' }, { indentation: 0, indentationStyle: 'tab', finalNewline: true })).toBe('{"a":"b"}\n')
	})
})
