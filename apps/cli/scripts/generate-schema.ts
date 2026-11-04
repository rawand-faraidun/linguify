import { join } from 'node:path'
import { generatedFileFormat, schemaFileName } from '@linguify/constants'
import { formatJson, generateConfigJsonSchema, writeFile } from '@linguify/core'

await writeFile(
	join(import.meta.dirname, '..', schemaFileName),
	formatJson(generateConfigJsonSchema(), generatedFileFormat)
)
