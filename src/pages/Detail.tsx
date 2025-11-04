import { useParams, useNavigate } from 'react-router'
import { useState, useEffect, useMemo } from 'react'
import { apiService } from '@/services/api.service'
import { type DetailResponse } from '@/types'
import { useApiStore } from '@/store/apiStore'
import { Chip, Button, Spinner, Tooltip, Divider, Select, SelectItem } from '@heroui/react'
import { useDocumentTitle } from '@/hooks'
import { ArrowUpIcon, ArrowDownIcon } from '@/components/icons'

export default function Detail() {
  const { sourceCode, vodId } = useParams<{ sourceCode: string; vodId: string }>()
  const navigate = useNavigate()
  const { videoAPIs } = useApiStore()

  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReversed, setIsReversed] = useState(true)
  const [currentPageRange, setCurrentPageRange] = useState<string>('')
  const [openTooltipIndex, setOpenTooltipIndex] = useState<number | null>(null)
  const [episodesPerPage, setEpisodesPerPage] = useState(100)

  // 计算响应式的每页集数 (基于屏幕尺寸和列数)
  useEffect(() => {
    const calculateEpisodesPerPage = () => {
      const width = window.innerWidth
      let cols = 2 // 手机默认2列
      let rows = 8 // 默认行数

      if (width >= 1024) {
        cols = 8 // 桌面端8列
        rows = 5 // 桌面端行数，确保一屏显示完整
      } else if (width >= 768) {
        cols = 6 // 平板横屏6列
        rows = 6 // 平板行数
      } else if (width >= 640) {
        cols = 3 // 平板竖屏3列
        rows = 8
      }

      setEpisodesPerPage(cols * rows)
    }

    calculateEpisodesPerPage()
    window.addEventListener('resize', calculateEpisodesPerPage)
    return () => window.removeEventListener('resize', calculateEpisodesPerPage)
  }, [])

  // 动态更新页面标题
  useDocumentTitle(detail?.videoInfo?.title || '视频详情')

  // 获取显示信息的辅助函数
  const getTitle = () => detail?.videoInfo?.title || ''
  const getCover = () =>
    detail?.videoInfo?.cover || 'https://via.placeholder.com/300x400?text=暂无封面'
  const getType = () => detail?.videoInfo?.type || ''
  const getYear = () => detail?.videoInfo?.year || ''
  const getDirector = () => detail?.videoInfo?.director || ''
  const getActor = () => detail?.videoInfo?.actor || ''
  const getArea = () => detail?.videoInfo?.area || ''
  const getContent = () => detail?.videoInfo?.desc || ''
  const getSourceName = () => detail?.videoInfo?.source_name || ''

  // 计算分页范围（根据正序倒序调整标签）
  const pageRanges = useMemo(() => {
    const totalEpisodes = detail?.videoInfo?.episodes_names?.length || 0
    if (totalEpisodes === 0) return []

    const ranges: { label: string; value: string; start: number; end: number }[] = []

    if (isReversed) {
      // 倒序：从最后一集开始
      for (let i = 0; i < totalEpisodes; i += episodesPerPage) {
        const start = i
        const end = Math.min(i + episodesPerPage - 1, totalEpisodes - 1)
        // 倒序时，标签应该显示从大到小
        const labelStart = totalEpisodes - start
        const labelEnd = totalEpisodes - end
        ranges.push({
          label: `${labelStart}-${labelEnd}`,
          value: `${start}-${end}`,
          start,
          end,
        })
      }
    } else {
      // 正序：从第一集开始
      for (let i = 0; i < totalEpisodes; i += episodesPerPage) {
        const start = i
        const end = Math.min(i + episodesPerPage - 1, totalEpisodes - 1)
        ranges.push({
          label: `${start + 1}-${end + 1}`,
          value: `${start}-${end}`,
          start,
          end,
        })
      }
    }

    return ranges
  }, [detail?.videoInfo?.episodes_names?.length, episodesPerPage, isReversed])

  // 当前页显示的剧集
  const currentPageEpisodes = useMemo(() => {
    if (!currentPageRange || !detail?.videoInfo?.episodes_names) return []

    const [start, end] = currentPageRange.split('-').map(Number)
    const totalEpisodes = detail.videoInfo.episodes_names.length
    const episodes = detail.videoInfo.episodes_names

    if (isReversed) {
      // 倒序：取出对应范围的集数并反转
      const selectedEpisodes = []
      for (let i = start; i <= end; i++) {
        const actualIndex = totalEpisodes - 1 - i
        if (actualIndex >= 0 && actualIndex < totalEpisodes) {
          selectedEpisodes.push({
            name: episodes[actualIndex],
            displayIndex: i,
            actualIndex: actualIndex,
          })
        }
      }
      return selectedEpisodes
    } else {
      // 正序：直接取出对应范围
      return episodes.slice(start, end + 1).map((name, idx) => ({
        name,
        displayIndex: start + idx,
        actualIndex: start + idx,
      }))
    }
  }, [currentPageRange, detail?.videoInfo?.episodes_names, isReversed])

  useEffect(() => {
    const fetchDetail = async () => {
      if (!sourceCode || !vodId) return

      setLoading(true)
      try {
        // 根据 sourceCode 找到对应的 API 配置
        const api = videoAPIs.find(api => api.id === sourceCode)
        if (!api) {
          throw new Error('未找到对应的API配置')
        }

        const response = await apiService.getVideoDetail(vodId, api)
        setDetail(response)
      } catch (error) {
        console.error('获取视频详情失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [sourceCode, vodId, videoAPIs])

  // 初始化当前页范围 & 当切换正序倒序时自动调整页码
  useEffect(() => {
    if (pageRanges.length === 0) return

    // 切换正序倒序时，跳转到第一页
    setCurrentPageRange(pageRanges[0].value)
  }, [pageRanges, isReversed])

  // 处理播放按钮点击
  const handlePlayEpisode = (displayIndex: number) => {
    // displayIndex 是在当前显示列表中的索引（已考虑倒序）
    // 需要转换成原始列表中的实际索引
    const actualIndex = isReversed
      ? (detail?.videoInfo?.episodes_names?.length || 0) - 1 - displayIndex
      : displayIndex
    // 跳转到播放页面,使用新的路由格式,不传递 state
    navigate(`/video/${sourceCode}/${vodId}/${actualIndex}`)
  }

  // 处理长按开始
  const handleLongPressStart = (index: number) => {
    const timer = setTimeout(() => {
      setOpenTooltipIndex(index)
    }, 500)
    return () => clearTimeout(timer)
  }

  // 处理长按结束
  const handleLongPressEnd = () => {
    if (openTooltipIndex !== null) {
      setTimeout(() => {
        setOpenTooltipIndex(null)
      }, 300)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" label="加载中..." />
      </div>
    )
  }

  if (!detail || detail.code !== 200) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">获取视频详情失败</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto overflow-x-hidden p-4 pb-15 md:pt-10">
      {/* 视频信息卡片 */}

      <div className="flex gap-5">
        {/* 封面图 */}
        <img
          src={getCover()}
          alt={getTitle()}
          className="hidden w-70 rounded-lg shadow-lg md:block"
        />

        {/* 详细信息 */}
        <div className="flex flex-1 flex-col gap-3 rounded-lg bg-white/40 p-4 shadow-lg/5 backdrop-blur-md">
          {/* 移动端封面 */}
          <img src={getCover()} alt={getTitle()} className="rounded-lg shadow-lg md:hidden" />
          {/* 标题 */}
          {getTitle() && (
            <h1 className="text-3xl font-bold">
              <span className="text-gray-800">{getTitle()}</span>
            </h1>
          )}
          <div className="flex flex-wrap gap-x-1 gap-y-2">
            <Chip color="primary" variant="shadow" className="mr-2">
              {getSourceName()}
            </Chip>
            <Chip color="secondary" variant="shadow" className="mr-2">
              {getYear()}
            </Chip>
            <Chip color="warning" variant="shadow" className="mr-2">
              {getType()}
            </Chip>
            <Chip color="danger" variant="shadow" className="mr-2">
              {getArea()}
            </Chip>
          </div>

          {/* 详细信息 */}
          <div className="mt-1 flex flex-col gap-2 pl-1">
            {getDirector() && (
              <div className="text-gray-600">
                <span className="font-semibold text-gray-900">导演：</span>
                <span>{getDirector()}</span>
              </div>
            )}

            {getActor() && (
              <div className="text-gray-600">
                <span className="font-semibold text-gray-900">演员：</span>
                <span>{getActor()}</span>
              </div>
            )}

            {getContent() && (
              <div className="mt-3 text-gray-600">
                <div dangerouslySetInnerHTML={{ __html: getContent() }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 播放列表 */}
      {detail?.videoInfo?.episodes_names && detail.videoInfo.episodes_names.length > 0 && (
        <div className="mt-8 flex flex-col">
          <div className="flex flex-col gap-2 p-3 pr-0 pl-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-row items-end gap-2">
                <h2 className="text-2xl font-semibold text-gray-900">选集</h2>
              </div>
              <div className="flex items-end">
                {pageRanges.length > 1 && (
                  <Select
                    size="sm"
                    selectedKeys={[currentPageRange]}
                    onChange={e => setCurrentPageRange(e.target.value)}
                    className="w-35"
                    classNames={{
                      trigger: 'bg-white/30 backdrop-blur-md border border-gray-200',
                      value: 'text-gray-800 font-medium',
                      popoverContent: 'bg-white/40 backdrop-blur-2xl border border-gray-200/50',
                    }}
                    aria-label="选择集数范围"
                    placeholder="选择集数范围"
                  >
                    {pageRanges.map(range => (
                      <SelectItem key={range.value}>{range.label}</SelectItem>
                    ))}
                  </Select>
                )}
              </div>
            </div>
            <Divider></Divider>
          </div>
          {/* 列表 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8">
            {currentPageEpisodes.map(({ name, displayIndex }) => (
              <Tooltip
                key={`${name}-${displayIndex}`}
                content={name}
                placement="top"
                delay={1000}
                isOpen={openTooltipIndex === displayIndex}
                onOpenChange={open => {
                  if (!open) setOpenTooltipIndex(null)
                }}
              >
                <Button
                  size="md"
                  color="default"
                  variant="shadow"
                  className="border border-gray-200 bg-white/30 text-gray-800 drop-shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/80 hover:text-white"
                  onPress={() => handlePlayEpisode(displayIndex)}
                  onPressStart={() => handleLongPressStart(displayIndex)}
                  onPressEnd={handleLongPressEnd}
                >
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
                </Button>
              </Tooltip>
            ))}
          </div>
          <div className="mt-4 flex items-end justify-between pr-4">
            <Button
              size="sm"
              variant="light"
              onPress={() => setIsReversed(!isReversed)}
              startContent={isReversed ? <ArrowUpIcon size={18} /> : <ArrowDownIcon size={18} />}
              className="min-w-unit-16 text-sm text-gray-600"
            >
              {isReversed ? '正序' : '倒序'}
            </Button>
            <span className="text-sm text-gray-600">
              共 {detail.videoInfo.episodes_names.length} 集
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
