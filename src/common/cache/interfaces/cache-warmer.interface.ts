export interface CacheWarmer {
  warm(): Promise<void>;
}
