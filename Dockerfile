# 多阶段构建
# 第一阶段：构建应用
FROM node:20-alpine AS builder

# 构建参数
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
ARG VITE_PROXY_URL
ARG VITE_INITIAL_VIDEO_SOURCES
ARG VITE_DISABLE_ANALYTICS

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@10.15.1

# 复制依赖声明及 .npmrc（确保私有源/registry 配置在安装时生效）
COPY package.json pnpm-lock.yaml .npmrc ./

# 安装依赖（使用 frozen-lockfile 保证与锁文件一致，不生成新锁）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 设置构建时环境变量
ENV VITE_PROXY_URL=${VITE_PROXY_URL}
ENV VITE_INITIAL_VIDEO_SOURCES=${VITE_INITIAL_VIDEO_SOURCES}
ENV VITE_DISABLE_ANALYTICS=${VITE_DISABLE_ANALYTICS:-true}

# 构建应用
RUN pnpm build

# 第二阶段：运行时环境
FROM nginx:alpine AS production

# 添加标签
LABEL org.opencontainers.image.title="OuonnkiTV"
LABEL org.opencontainers.image.description="OuonnkiTV Web Application"
LABEL org.opencontainers.image.version=${VERSION}
LABEL org.opencontainers.image.created=${BUILD_DATE}
LABEL org.opencontainers.image.revision=${VCS_REF}
LABEL org.opencontainers.image.source="https://github.com/Ouonnki/OuonnkiTV"

# 复制构建产物到 nginx 静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
