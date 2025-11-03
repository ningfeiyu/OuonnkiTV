import { useParams, useNavigate } from 'react-router'
import { useState, useEffect } from 'react'
import { apiService } from '@/services/api.service'
import { type DetailResponse } from '@/types'
import { useApiStore } from '@/store/apiStore'
import { Chip, Button, Spinner } from '@heroui/react'
import { useDocumentTitle } from '@/hooks'

export default function Detail() {
  const { sourceCode, vodId } = useParams<{ sourceCode: string; vodId: string }>()
  const navigate = useNavigate()
  const { videoAPIs } = useApiStore()

  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // 动态更新页面标题
  useDocumentTitle(detail?.videoInfo?.title || '视频详情')

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

  // 处理播放按钮点击
  const handlePlayEpisode = (index: number) => {
    // 跳转到播放页面，使用新的路由格式
    navigate(`/video/${sourceCode}/${vodId}/${index}`, {
      state: {
        detail,
        episodeIndex: index,
      },
    })
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

  const videoInfo = detail.videoInfo

  // 获取显示信息的辅助函数
  const getTitle = () => videoInfo?.title || ''
  const getCover = () => videoInfo?.cover || 'https://via.placeholder.com/300x400?text=暂无封面'
  const getType = () => videoInfo?.type || ''
  const getYear = () => videoInfo?.year || ''
  const getDirector = () => videoInfo?.director || ''
  const getActor = () => videoInfo?.actor || ''
  const getArea = () => videoInfo?.area || ''
  const getContent = () => videoInfo?.desc || ''
  const getSourceName = () => videoInfo?.source_name || ''
  const getEpisodesNames = () => videoInfo?.episodes_names || []

  return (
    <div className="container mx-auto p-4 pb-15 md:pt-10">
      {/* 视频信息卡片 */}

      <div className="flex gap-5">
        {/* 封面图 */}
        <img src={getCover()} alt={getTitle()} className="hidden rounded-lg shadow-lg md:block" />

        {/* 详细信息 */}
        <div className="flex flex-col gap-3 rounded-lg bg-white/40 p-4 shadow-lg backdrop-blur-md">
          {/* 移动端封面 */}
          <img src={getCover()} alt={getTitle()} className="rounded-lg shadow-lg md:hidden" />
          {/* 标题 */}
          {getTitle() && (
            <h1 className="text-3xl font-bold">
              <span className="text-gray-800">{getTitle()}</span>
            </h1>
          )}
          <div>
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
      {getEpisodesNames() && getEpisodesNames().length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-5 md:grid-cols-6 lg:grid-cols-8">
          {getEpisodesNames().map((name, index) => (
            <Button
              key={name}
              size="md"
              color="default"
              variant="shadow"
              className="border border-gray-200 bg-white/30 text-gray-800 shadow backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/80 hover:text-white"
              onPress={() => handlePlayEpisode(index)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
