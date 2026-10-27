# 固定到具体补丁版本，避免构建结果随上游浮动，也便于安全审计与回滚。
FROM node:24.22.1-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build

# ---- 后端依赖 ----
# bcrypt 与 sqlite3 都含原生扩展（.node 二进制）。
#
# 已知问题（Node.js 24 + Alpine）：
# 1. sqlite3@5.1.7 的安装脚本 `prebuild-install -r napi || node-gyp rebuild` 中，
#    其依赖的 node-abi 尚不能识别 Node 24 的 N-API 版本，自动探测得到
#    target=undefined，于是回退到源码编译。
# 2. 该回退同样失败：node-gyp@8.4.1 依赖 Python 的 distutils 模块，
#    而 Alpine 的 Python 3.12+ 已移除该模块
#    （ModuleNotFoundError: No module named 'distutils'）。
#
# 因此先用 --ignore-scripts 完成依赖解析（避开失败的回退逻辑），
# 再分别执行两个原生模块各自的预编译安装命令。
FROM node:24.22.1-alpine AS deps

WORKDIR /app

COPY backend/package*.json ./

# 第 1 步：安装依赖，跳过安装脚本
RUN npm ci --omit=dev --ignore-scripts

# 第 2 步：安装原生模块的 N-API 预编译二进制
#   bcrypt  -> node-pre-gyp 的 napi-v3 包（与 Node 版本无关）
#   sqlite3 -> prebuild-install 的 napi-v6 包（显式指定，绕过自动探测）
RUN cd node_modules/bcrypt \
    && node ../@mapbox/node-pre-gyp/bin/node-pre-gyp install --fallback-to-build \
    && cd ../sqlite3 \
    && node ../prebuild-install/bin.js --runtime napi --target 6 \
    && cd ../.. \
    && npm cache clean --force

# ---- 最终镜像 ----
FROM node:24.22.1-alpine

WORKDIR /app

# 原生模块运行时需要 libstdc++；su-exec 用于入口脚本降权运行
RUN apk add --no-cache libstdc++ su-exec

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .

COPY --from=builder /app/frontend/dist ./dist

# 入口脚本：修正 bind mount 目录属主后降权到 node 用户运行，
# 避免挂载目录属主为 root 时 SQLite 报 "attempt to write a readonly database"。
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# 兜底：若在 Windows 环境下构建导致脚本带 CRLF，shebang 会失效，
# 这里统一去回车符并赋予执行权限（.gitattributes 已约定 LF，此为二次防护）。
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p database uploads \
    && chown -R node:node /app/database /app/uploads /app

# 容器以 root 启动入口脚本（仅为修正挂载目录属主），随即降权到 node 用户；
# 若 compose 中显式指定了 user:，则入口脚本会直接以该用户运行应用。
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]

EXPOSE 3000
