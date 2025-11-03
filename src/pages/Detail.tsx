import { useParams, useNavigate } from 'react-router'
import { useState, useEffect } from 'react'
import { apiService } from '@/services/api.service'
import { type DetailResponse } from '@/types'
import { useApiStore } from '@/store/apiStore'
import { Card, CardHeader, CardBody, Chip, Button, Spinner } from '@heroui/react'
import { useDocumentTitle } from '@/hooks'

export default function Detail() {
  const { sourceCode, vodId } = useParams<{ sourceCode: string; vodId: string }>()
  const navigate = useNavigate()
  const { videoAPIs } = useApiStore()

  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEpisode, setSelectedEpisode] = useState(0)

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
    setSelectedEpisode(index)
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
  const displayInfo = videoInfo

  // 获取显示信息的辅助函数
  const getTitle = () => videoInfo?.title || ''
  const getCover = () => videoInfo?.cover || 'https://via.placeholder.com/300x400?text=暂无封面'
  const getType = () => videoInfo?.type || ''
  const getYear = () => videoInfo?.year || ''
  const getDirector = () => videoInfo?.director || ''
  const getActor = () => videoInfo?.actor || ''
  const getArea = () => videoInfo?.area || ''
  const getContent = () => videoInfo?.desc || ''

  return (
    <div className="container mx-auto p-4">
      {/* 视频信息卡片 */}
      <Card className="mb-6">
        <CardHeader className="flex gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">{getTitle()}</h1>
            <div className="mt-2 flex gap-2">
              {displayInfo?.source_name && (
                <Chip size="sm" color="primary" variant="flat">
                  {displayInfo.source_name}
                </Chip>
              )}
              {getType() && (
                <Chip size="sm" color="secondary" variant="flat">
                  {getType()}
                </Chip>
              )}
              {getYear() && (
                <Chip size="sm" variant="flat">
                  {getYear()}
                </Chip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* 封面图 */}
            <div className="md:col-span-1">
              <img src={getCover()} alt={getTitle()} className="w-full rounded-lg shadow-lg" />
            </div>

            {/* 详细信息 */}
            <div className="space-y-4 md:col-span-2">
              {getDirector() && (
                <div>
                  <span className="font-semibold">导演：</span>
                  <span className="text-gray-600">{getDirector()}</span>
                </div>
              )}

              {getActor() && (
                <div>
                  <span className="font-semibold">主演：</span>
                  <span className="text-gray-600">{getActor()}</span>
                </div>
              )}

              {getArea() && (
                <div>
                  <span className="font-semibold">地区：</span>
                  <span className="text-gray-600">{getArea()}</span>
                </div>
              )}

              {getContent() && (
                <div>
                  <span className="font-semibold">剧情简介：</span>
                  <p className="mt-2 text-gray-600">{getContent()}</p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 播放列表 */}
      {detail.episodes && detail.episodes.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">播放列表</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {detail.episodes.map((_, index) => (
                <Button
                  key={index}
                  size="sm"
                  color={selectedEpisode === index ? 'primary' : 'default'}
                  variant={selectedEpisode === index ? 'solid' : 'flat'}
                  onPress={() => handlePlayEpisode(index)}
                >
                  第{index + 1}集
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
