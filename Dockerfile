# CloudBase 云托管
# 对齐 keyan：默认探活 / 流量端口为 80，构建走国内 npm 源

ARG NODE_IMAGE=node:20-alpine
ARG NPM_REGISTRY=https://registry.npmmirror.com

FROM ${NODE_IMAGE}
WORKDIR /app

COPY package.json package-lock.json ./
ARG NPM_REGISTRY
RUN npm config set registry "${NPM_REGISTRY}" \
  && npm config set fetch-retries 5 \
  && npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# CloudBase 默认探活端口是 80；绑定 <1024 需要 root，故不切非特权用户
ENV PORT=80
ENV HOST=0.0.0.0

EXPOSE 80
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "80"]
