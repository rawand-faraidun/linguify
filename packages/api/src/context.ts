import type { LoadConfigOptions } from '@linguify/core'

/**
 * what every procedure is told: where the project is, and the layers above its config file
 *
 * @note the config itself is loaded on every call, never held — a config edited while the studio
 * runs takes effect on the next request, and a call such as `init` that needs no config can still run
 */
export type Context = LoadConfigOptions
