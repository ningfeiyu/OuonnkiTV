import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { SearchHistory, SearchHistoryItem, VideoItem } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// 搜索结果缓存最大数量
const MAX_CACHE_SIZE = 10

interface SearchState {
  // 当前搜索查询
  query: string
  // 搜索历史记录
  searchHistory: SearchHistory
  // 搜索结果缓存 (query -> results)
  searchResultsCache: Record<string, VideoItem[]>
}

interface SearchActions {
  // 设置搜索查询
  setQuery: (query: string) => void
  // 清空搜索查询
  clearQuery: () => void
  // 添加搜索历史项
  addSearchHistoryItem: (content: string) => void
  // 删除搜索历史项
  removeSearchHistoryItem: (id: string) => void
  // 清空搜索历史
  clearSearchHistory: () => void
  // 获取缓存的搜索结果
  getCachedResults: (query: string) => VideoItem[] | undefined
  // 设置搜索结果缓存
  setCachedResults: (query: string, results: VideoItem[]) => void
  // 清空搜索结果缓存
  clearSearchResultsCache: () => void
}

type SearchStore = SearchState & SearchActions

export const useSearchStore = create<SearchStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初始状态
        query: '',
        searchHistory: [],
        searchResultsCache: {},

        // Actions
        setQuery: (query: string) => {
          set(state => {
            state.query = query
          })
        },

        clearQuery: () => {
          set(state => {
            state.query = ''
          })
        },

        addSearchHistoryItem: (content: string) => {
          set(state => {
            const existingItem = state.searchHistory.find(
              (item: SearchHistoryItem) => item.content === content,
            )

            if (existingItem) {
              // 更新现有项的时间戳
              existingItem.updatedAt = Date.now()
            } else {
              // 添加新项到历史记录开头
              const newItem: SearchHistoryItem = {
                id: uuidv4(),
                content,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }
              state.searchHistory.unshift(newItem)
            }

            // 按更新时间排序
            state.searchHistory.sort(
              (a: SearchHistoryItem, b: SearchHistoryItem) => b.updatedAt - a.updatedAt,
            )
          })
        },

        removeSearchHistoryItem: (id: string) => {
          set(state => {
            state.searchHistory = state.searchHistory.filter(
              (item: SearchHistoryItem) => item.id !== id,
            )
          })
        },

        clearSearchHistory: () => {
          set(state => {
            state.searchHistory = []
          })
        },

        getCachedResults: (query: string) => {
          return get().searchResultsCache[query]
        },

        setCachedResults: (query: string, results: VideoItem[]) => {
          set(state => {
            // 如果缓存数量超过限制,删除最旧的缓存
            const cacheKeys = Object.keys(state.searchResultsCache)
            if (cacheKeys.length >= MAX_CACHE_SIZE) {
              const firstKey = cacheKeys[0]
              if (firstKey) {
                delete state.searchResultsCache[firstKey]
              }
            }
            state.searchResultsCache[query] = results
          })
        },

        clearSearchResultsCache: () => {
          set(state => {
            state.searchResultsCache = {}
          })
        },
      })),
      {
        name: 'ouonnki-tv-search-store', // 持久化存储的键名
        partialize: state => ({
          // 只持久化搜索历史，不持久化当前查询和搜索状态
          searchHistory: state.searchHistory,
        }),
      },
    ),
    {
      name: 'SearchStore', // DevTools 中显示的名称
    },
  ),
)
