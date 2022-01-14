export type StorageConfigEntry = LocalStorageConfigEntry | IpfsStorageConfigEntry;
interface LocalStorageConfigEntry {
  type: "local",
  id: string
  path: string
}
interface IpfsStorageConfigEntry {
  type: "ipfs",
  id: string
}