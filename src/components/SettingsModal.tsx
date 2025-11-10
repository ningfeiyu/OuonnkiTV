import {
  useCheckbox,
  Chip,
  VisuallyHidden,
  Tooltip,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Tabs,
  Tab,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
} from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { useApiStore } from '@/store/apiStore'
import type { VideoApi } from '@/types'
import { useViewport } from '@/hooks'

import {
  CheckIcon,
  CircleCheckIcon,
  LinkIcon,
  TagIcon,
  TrashIcon,
  ServerIcon,
  PackageIcon,
  DownloadIcon,
} from '@/components/icons'
import { createPortal } from 'react-dom'
import ImportSourceModal from './ImportSourceModal'

const AllSelectedCheckbox = ({
  onValueChange,
  selectedCount,
  totalCount,
}: {
  onValueChange?: (isSelected: boolean) => void
  selectedCount: number
  totalCount: number
}) => {
  const isAllSelected = selectedCount === totalCount && totalCount > 0
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount

  const { isFocusVisible, getBaseProps, getLabelProps, getInputProps } = useCheckbox({
    name: 'all',
    value: 'all',
    isSelected: isAllSelected,
    isIndeterminate: isPartiallySelected,
    onChange: e => {
      onValueChange?.(e.target.checked)
    },
  })

  return (
    <label {...getBaseProps()} className="inline-flex cursor-pointer">
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
        <Chip
          classNames={{
            base: `
              transition-all duration-300 
              ${
                isAllSelected
                  ? 'bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 shadow border-gray-600'
                  : isPartiallySelected
                    ? 'bg-gradient-to-br from-gray-500 to-gray-700 hover:from-gray-400 hover:to-gray-600 shadow border-gray-500'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 shadow-sm border-gray-300'
              }
              ${isFocusVisible ? 'ring-2 ring-gray-400 ring-offset-2' : ''}
              px-2.5 py-1 text-xs font-medium
            `,
            content:
              isAllSelected || isPartiallySelected ? 'text-white text-xs' : 'text-gray-700 text-xs',
          }}
          startContent={
            <AnimatePresence mode="wait">
              {isAllSelected ? (
                <motion.div
                  key="checked"
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: 90, scale: 0 }}
                  transition={{ duration: 0.2, type: 'spring', stiffness: 300 }}
                >
                  <CheckIcon size={12} className="text-white" />
                </motion.div>
              ) : isPartiallySelected ? (
                <motion.div
                  key="indeterminate"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  key="unchecked"
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: 90, scale: 0 }}
                  transition={{ duration: 0.2, type: 'spring', stiffness: 300 }}
                >
                  <CircleCheckIcon className="text-gray-600" size={12} />
                </motion.div>
              )}
            </AnimatePresence>
          }
          variant="bordered"
          {...getLabelProps()}
        >
          <motion.span
            key={isAllSelected ? 'selected' : isPartiallySelected ? 'partial' : 'unselected'}
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {isAllSelected ? '取消' : '全选'}
          </motion.span>
        </Chip>
      </motion.div>
    </label>
  )
}

export default function SettingsModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) {
  const { isMobile } = useViewport()

  const CardClassNames = {
    base: 'overflow-y-auto h-[17rem] w-full bg-transparent dark:bg-transparent border-medium border-default-200 shadow-xs rounded-medium',
  }
  // 视频源设置
  const {
    selectAllAPIs,
    deselectAllAPIs,
    videoAPIs,
    addAndUpdateVideoAPI,
    removeVideoAPI,
    setApiEnabled,
  } = useApiStore()
  const selectedAPIs = useMemo(() => {
    return videoAPIs.filter(api => api.isEnabled)
  }, [videoAPIs])
  const apiInfos = videoAPIs

  // 自定义源状态
  const [isAddingCustomSource, setIsAddingCustomSource] = useState(false)
  const [customSourceUrl, setCustomSourceUrl] = useState('')
  const [customSourceName, setCustomSourceName] = useState('')
  const [customDetailUrl, setCustomDetailUrl] = useState('')
  const [isAddingAnimation, setIsAddingAnimation] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [copiedUrl, setCopiedUrl] = useState('')
  const [copiedPosition, setCopiedPosition] = useState<{ x: number; y: number } | null>(null)

  // 导入源模态框状态
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // URL验证函数
  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setUrlError('')
      return false
    }

    // 检查是否以http://或https://开头
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('URL必须以 http:// 或 https:// 开头')
      return false
    }

    try {
      const urlObj = new URL(url)
      // 只允许 http 和 https 协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        setUrlError('只支持 http 或 https 协议')
        return false
      }
      // 检查是否有主机名
      if (!urlObj.hostname) {
        setUrlError('请输入完整的URL地址')
        return false
      }
      setUrlError('')
      return true
    } catch {
      setUrlError('URL格式不正确')
      return false
    }
  }

  // 处理URL输入变化
  const handleUrlChange = (value: string) => {
    setCustomSourceUrl(value)
    if (value.trim()) {
      validateUrl(value)
    } else {
      setUrlError('')
    }
  }

  // 处理添加自定义源
  const handleAddCustomSource = () => {
    if (!validateUrl(customSourceUrl.trim())) {
      return
    }

    if (customSourceUrl.trim() && customSourceName.trim()) {
      // 添加动画状态
      setIsAddingAnimation(true)

      const newApi: VideoApi = {
        id: uuidv4(),
        url: customSourceUrl.trim(),
        name: customSourceName.trim(),
        detailUrl: customDetailUrl.trim() || customSourceUrl.trim(), // detail留空时和url字段保持一致
        isEnabled: true,
      }

      // 延迟添加以显示动画效果
      setTimeout(() => {
        addAndUpdateVideoAPI(newApi)
        // 重置状态
        setCustomSourceUrl('')
        setCustomSourceName('')
        setCustomDetailUrl('')
        setIsAddingCustomSource(false)
        setIsAddingAnimation(false)
        setUrlError('')
      }, 300)
    }
  }

  // 处理取消添加
  const handleCancelAdd = () => {
    setCustomSourceUrl('')
    setCustomSourceName('')
    setCustomDetailUrl('')
    setIsAddingCustomSource(false)
    setUrlError('')
  }

  // 表格数据
  const tableData = videoAPIs.map(api => ({
    source: api.url,
    name: api.name,
    id: api.id,
    api: api,
  }))
  return (
    <Modal
      classNames={{
        base: 'bg-transparent max-w-none w-auto',
        backdrop: 'bg-white/10',
      }}
      hideCloseButton
      backdrop="blur"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader>个性化设置</ModalHeader>
        <ModalBody className="flex-0">
          <div className="flex flex-col md:w-130">
            <Tabs
              variant="bordered"
              isVertical={!isMobile}
              disabledKeys={['other']}
              className="w-full md:w-auto"
            >
              <Tab className="w-full" key="video-source" title="视频源选择">
                <Card classNames={CardClassNames}>
                  <CardBody className="relative flex flex-col overflow-hidden p-0">
                    {/* 表格区域 - 始终保持完整高度 */}
                    <div className="scrollbar-hide relative flex-1 overflow-y-auto p-4">
                      {apiInfos.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex h-full flex-col items-center justify-center space-y-4 text-gray-400"
                        >
                          <motion.div
                            animate={{
                              y: [0, -5, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          >
                            <PackageIcon size={64} className="text-gray-400" />
                          </motion.div>
                          <p className="text-sm font-medium">暂无可用视频源</p>
                          <p className="text-xs text-gray-400">快去添加源后使用吧！</p>
                        </motion.div>
                      ) : (
                        <Table
                          aria-label="视频源列表"
                          isHeaderSticky
                          removeWrapper
                          classNames={{
                            base: 'h-full',
                            td: 'text-sm font-medium text-gray-500',
                            table:
                              'table-fixed [&>thead>tr>th:first-child]:w-[15%] [&>thead>tr>th:nth-child(2)]:w-[55%] [&>thead>tr>th:last-child]:w-[30%]',
                          }}
                        >
                          <TableHeader>
                            <TableColumn>选择</TableColumn>
                            <TableColumn>源名称</TableColumn>
                            <TableColumn>状态</TableColumn>
                          </TableHeader>
                          <TableBody items={apiInfos}>
                            {(item: VideoApi) => {
                              const index = apiInfos.findIndex(api => api.id === item.id)
                              const isChecked = selectedAPIs.some(api => api.id === item.id)
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.02 }}
                                    >
                                      <Checkbox
                                        color="default"
                                        isSelected={isChecked}
                                        onValueChange={checked => {
                                          setApiEnabled(item.id, checked)
                                        }}
                                      />
                                    </motion.div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.02 + 0.05 }}
                                    >
                                      <Tooltip
                                        delay={1000}
                                        placement="top"
                                        offset={10}
                                        shouldFlip={true}
                                        showArrow={true}
                                        classNames={{
                                          content: 'max-w-[200px] break-words text-xs p-2',
                                          base: 'max-w-[200px]',
                                        }}
                                        content={<div className="max-w-full">{item.name}</div>}
                                      >
                                        <p className="truncate font-medium">{item.name}</p>
                                      </Tooltip>
                                    </motion.div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: isChecked ? 1 : 0.3 }}
                                      transition={{ duration: 0.2 }}
                                      className="flex items-center gap-1.5"
                                    >
                                      {isChecked ? (
                                        <>
                                          <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-green-500" />
                                          <span className="text-xs whitespace-nowrap text-green-600">
                                            启用
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-gray-300" />
                                          <span className="text-xs whitespace-nowrap text-gray-400">
                                            未启用
                                          </span>
                                        </>
                                      )}
                                    </motion.div>
                                  </TableCell>
                                </TableRow>
                              )
                            }}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {/* 底部操作区域 - 始终固定在底部 */}
                    <div className="border-default-200 flex items-center justify-between border-t p-4">
                      <AllSelectedCheckbox
                        onValueChange={isAllSelected => {
                          if (isAllSelected) {
                            selectAllAPIs()
                          } else {
                            deselectAllAPIs()
                          }
                        }}
                        selectedCount={selectedAPIs.length}
                        totalCount={apiInfos.length}
                      />
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-xs font-medium text-gray-500"
                      >
                        {selectedAPIs.length}/{apiInfos.length}
                      </motion.span>
                    </div>
                  </CardBody>
                </Card>
              </Tab>
              <Tab className="w-full" key="custom-source" title="添加视频源">
                <Card classNames={CardClassNames}>
                  <CardBody className="relative flex flex-col overflow-hidden p-0">
                    {/* 表格区域 - 始终保持完整高度 */}
                    <div className="scrollbar-hide relative flex-1 overflow-y-auto p-4">
                      {tableData.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex h-full flex-col items-center justify-center space-y-4 text-gray-400"
                        >
                          <motion.div
                            animate={{
                              y: [0, -5, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          >
                            <ServerIcon size={64} className="text-gray-400" />
                          </motion.div>
                          <p className="text-sm font-medium">暂无视频源</p>
                          <p className="text-xs text-gray-400">点击下方按钮添加您的第一个视频源</p>
                        </motion.div>
                      ) : (
                        <Table
                          aria-label="视频源列表"
                          isHeaderSticky
                          removeWrapper
                          classNames={{
                            base: 'h-full',
                            td: 'text-sm font-medium text-gray-500',
                            table:
                              'table-fixed [&>thead>tr>th:first-child]:w-[40%] [&>thead>tr>th:nth-child(2)]:w-[40%] [&>thead>tr>th:last-child]:w-[20%]',
                          }}
                        >
                          <TableHeader>
                            <TableColumn>源地址</TableColumn>
                            <TableColumn>源名称</TableColumn>
                            <TableColumn>操作</TableColumn>
                          </TableHeader>
                          <TableBody items={tableData}>
                            {(item: {
                              source: string
                              name: string
                              id: string
                              api: VideoApi
                            }) => {
                              const index = tableData.findIndex(data => data.id === item.id)
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="relative"
                                    >
                                      <Tooltip
                                        delay={1000}
                                        placement="top"
                                        offset={10}
                                        shouldFlip={true}
                                        showArrow={true}
                                        classNames={{
                                          content: 'max-w-[280px] break-all text-xs p-2',
                                          base: 'max-w-[280px]',
                                        }}
                                        content={
                                          <div className="max-w-full">
                                            <p className="mb-1">{item.source}</p>
                                            <p className="text-xs text-gray-400">
                                              {copiedUrl === item.source ? '✓ 已复制' : '点击复制'}
                                            </p>
                                          </div>
                                        }
                                      >
                                        <p
                                          className={`cursor-pointer truncate transition-all duration-300 ${
                                            copiedUrl === item.source
                                              ? 'font-medium text-green-600'
                                              : 'hover:text-blue-600'
                                          }`}
                                          onClick={e => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            setCopiedPosition({
                                              x: rect.left + rect.width / 2,
                                              y: rect.top,
                                            })
                                            navigator.clipboard.writeText(item.source)
                                            setCopiedUrl(item.source)
                                            setTimeout(() => {
                                              setCopiedUrl('')
                                              setCopiedPosition(null)
                                            }, 2000)
                                          }}
                                        >
                                          {item.source}
                                        </p>
                                      </Tooltip>
                                    </motion.div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 + 0.05 }}
                                    >
                                      <Tooltip
                                        delay={1000}
                                        placement="top"
                                        offset={10}
                                        shouldFlip={true}
                                        showArrow={true}
                                        classNames={{
                                          content: 'max-w-[200px] break-words text-xs p-2',
                                          base: 'max-w-[200px]',
                                        }}
                                        content={<div className="max-w-full">{item.name}</div>}
                                      >
                                        <p className="truncate">{item.name}</p>
                                      </Tooltip>
                                    </motion.div>
                                  </TableCell>
                                  <TableCell>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.05 + 0.1 }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Button
                                        size="sm"
                                        variant="light"
                                        isIconOnly
                                        radius="full"
                                        className="text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-500"
                                        onPress={() => {
                                          removeVideoAPI(item.id)
                                        }}
                                      >
                                        <TrashIcon size={16} />
                                      </Button>
                                    </motion.div>
                                  </TableCell>
                                </TableRow>
                              )
                            }}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {/* 底部按钮区域 - 始终固定在底部 */}
                    <div className="border-default-200 border-t p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          radius="full"
                          className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 font-medium text-gray-700 shadow-sm transition-all duration-300 hover:from-gray-200 hover:to-gray-300 hover:shadow-md"
                          onPress={() => setIsAddingCustomSource(true)}
                          startContent={
                            <motion.span
                              initial={{ rotate: 0 }}
                              whileHover={{ rotate: 90 }}
                              transition={{ duration: 0.3 }}
                            >
                              <PackageIcon size={16} />
                            </motion.span>
                          }
                        >
                          新增视频源
                        </Button>
                        <Button
                          size="sm"
                          variant="bordered"
                          radius="full"
                          className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 font-medium text-blue-700 shadow-sm transition-all duration-300 hover:scale-105 hover:from-blue-100 hover:to-blue-200 hover:shadow-md"
                          onPress={() => setIsImportModalOpen(true)}
                          startContent={<DownloadIcon size={16} />}
                        >
                          导入源
                        </Button>
                      </div>
                    </div>

                    {/* 新增表单覆盖层 */}
                    <AnimatePresence>
                      {isAddingCustomSource && (
                        <>
                          {/* 半透明背景 */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 z-10"
                            onClick={handleCancelAdd}
                          />

                          {/* 表单内容 */}
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            transition={{
                              duration: 0.25,
                              type: 'spring',
                              stiffness: 400,
                              damping: 25,
                            }}
                            className="border-default-200 absolute right-0 bottom-0 left-0 z-20 rounded-t-xl border-t bg-white/50 p-4 shadow-xl backdrop-blur-lg dark:bg-gray-900/50"
                          >
                            <div className="space-y-3">
                              <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                              >
                                <Input
                                  size="sm"
                                  radius="md"
                                  variant="bordered"
                                  label="源地址"
                                  placeholder="https://api.example.com"
                                  description={
                                    !urlError && customSourceUrl.trim() ? '✓ URL格式正确' : ''
                                  }
                                  value={customSourceUrl}
                                  onValueChange={handleUrlChange}
                                  isInvalid={!!urlError}
                                  errorMessage={urlError}
                                  color={urlError ? 'danger' : 'default'}
                                  classNames={{
                                    label: 'text-xs text-gray-600 font-medium',
                                    input: 'text-sm',
                                    inputWrapper: urlError
                                      ? 'bg-danger-50 border-danger-300 hover:border-danger-400'
                                      : 'bg-gradient-to-br from-default-100/50 to-default-200/30 hover:from-default-200/50 hover:to-default-300/30 transition-all duration-300',
                                    errorMessage: 'text-xs text-danger',
                                    description: 'text-xs text-success-600',
                                  }}
                                  startContent={
                                    <LinkIcon
                                      size={16}
                                      className={urlError ? 'text-danger-400' : 'text-gray-400'}
                                    />
                                  }
                                />
                              </motion.div>

                              <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                <Input
                                  size="sm"
                                  radius="md"
                                  variant="bordered"
                                  label="源名称"
                                  placeholder="示例源"
                                  value={customSourceName}
                                  onValueChange={setCustomSourceName}
                                  classNames={{
                                    label: 'text-xs text-gray-600 font-medium',
                                    input: 'text-sm',
                                    inputWrapper:
                                      'bg-gradient-to-br from-default-100/50 to-default-200/30 hover:from-default-200/50 hover:to-default-300/30 transition-all duration-300',
                                  }}
                                  startContent={<TagIcon size={16} className="text-gray-400" />}
                                />
                              </motion.div>

                              <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.25 }}
                              >
                                <Input
                                  size="sm"
                                  radius="md"
                                  variant="bordered"
                                  label="详情API地址 (可选)"
                                  placeholder="留空则使用源地址"
                                  description={
                                    customDetailUrl.trim()
                                      ? '将使用此地址获取视频详情'
                                      : '留空时将使用源地址作为详情API'
                                  }
                                  value={customDetailUrl}
                                  onValueChange={setCustomDetailUrl}
                                  classNames={{
                                    label: 'text-xs text-gray-600 font-medium',
                                    input: 'text-sm',
                                    inputWrapper:
                                      'bg-gradient-to-br from-default-100/50 to-default-200/30 hover:from-default-200/50 hover:to-default-300/30 transition-all duration-300',
                                    description: 'text-xs text-gray-500',
                                  }}
                                  startContent={<ServerIcon size={16} className="text-gray-400" />}
                                />
                              </motion.div>

                              <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="flex gap-2"
                              >
                                <Tooltip
                                  content={
                                    !customSourceUrl.trim()
                                      ? '请输入源地址'
                                      : urlError
                                        ? urlError
                                        : !customSourceName.trim()
                                          ? '请输入源名称'
                                          : ''
                                  }
                                  isDisabled={
                                    !(
                                      !customSourceUrl.trim() ||
                                      !customSourceName.trim() ||
                                      !!urlError
                                    )
                                  }
                                  placement="top"
                                >
                                  <Button
                                    size="sm"
                                    radius="full"
                                    className="flex-1 bg-gradient-to-br from-gray-600 to-gray-800 font-medium text-white shadow-md transition-all duration-300 hover:from-gray-700 hover:to-gray-900 hover:shadow-lg"
                                    onPress={handleAddCustomSource}
                                    isDisabled={
                                      !customSourceUrl.trim() ||
                                      !customSourceName.trim() ||
                                      !!urlError
                                    }
                                    isLoading={isAddingAnimation}
                                  >
                                    {!isAddingAnimation && (
                                      <motion.span
                                        initial={{ scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        添加
                                      </motion.span>
                                    )}
                                  </Button>
                                </Tooltip>
                                <Button
                                  size="sm"
                                  variant="light"
                                  radius="full"
                                  className="flex-1 text-gray-600 transition-all duration-300 hover:bg-gray-100 hover:text-gray-800"
                                  onPress={handleCancelAdd}
                                >
                                  取消
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </CardBody>
                </Card>
              </Tab>
              <Tab className="w-full" key="other" title="敬请期待...">
                <Card classNames={CardClassNames}>
                  <CardBody className="flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.5,
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                      className="space-y-4 text-center"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="text-6xl"
                      >
                        🚀
                      </motion.div>
                      <p className="text-lg font-medium text-gray-600">敬请期待...</p>
                      <p className="text-sm text-gray-400">更多精彩功能即将推出</p>
                    </motion.div>
                  </CardBody>
                </Card>
              </Tab>
            </Tabs>
          </div>
        </ModalBody>
        <ModalFooter>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              className="bg-gradient-to-br from-gray-600 to-gray-800 font-bold text-white shadow-lg transition-all duration-300 hover:from-gray-700 hover:to-gray-900"
              radius="full"
              onPress={() => onOpenChange(false)}
              size="md"
            >
              应用
            </Button>
          </motion.div>
        </ModalFooter>
      </ModalContent>

      {/* 复制成功提示 - 使用Portal渲染到body */}
      {copiedPosition &&
        copiedUrl &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -10 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="fixed z-[9999] flex items-center gap-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
              style={{
                left: copiedPosition.x,
                top: copiedPosition.y - 40,
                transform: 'translateX(-50%)',
              }}
            >
              <CheckIcon size={12} className="text-white" />
              <span>复制成功</span>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      {/* 导入源模态框 */}
      <ImportSourceModal isOpen={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
    </Modal>
  )
}
