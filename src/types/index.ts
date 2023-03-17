import { YoutubeSyncNodeConfiguration } from './generated/ConfigJson'

export type Config = Omit<YoutubeSyncNodeConfiguration, 'limits'> & {
  version: string
  limits: Omit<YoutubeSyncNodeConfiguration['limits'], 'storage'> & {
    storage: number
  }
}

export type ReadonlyConfig = DeepReadonly<Config>
export type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> }

type Secret<T> = { [K in keyof T]: '###SECRET###' }

export function toPrettyJSON(obj: unknown) {
  return JSON.stringify(obj, null, 2)
}

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> }