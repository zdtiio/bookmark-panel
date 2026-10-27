# 固定到具体补丁版本，避免构建结果随上游浮动，也便于安全审计与回滚。
# 从 node:20 升级到 Node.js 24.22.1（当前 LTS "Krypton"）。
FROM node:24.22.1-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build

# ---- 后端依赖：在带构建工具的独立阶段编译原生模块 ----
# bcrypt 与 sqlite3 含原生扩展，预编译包获取失败时会回退到 node-gyp 源码编译。
# 把构建工具链限制在这一层，最终镜像就不会带上编译工具。
FROM node:24.22.1-alpine AS deps

# python3 是 node-gyp 的必需依赖；make/g++ 用于编译 C/C++ 扩展。
# vips 等可选依赖不需要，这里只装最小集合。
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package*.json ./

# npm ci 保证依赖与 package-lock.json 完全一致（可复现构建）。
# 允许安装脚本执行，让原生模块完成编译。
RUN npm ci --omit=dev && npm cache clean --force

# ---- 最终镜像 ----
FROM node:24.22.1-alpine

WORKDIR /app

# 原生模块运行时可能依赖 libstdc++（g++ 产物），显式保留；
# 编译工具（python3/make/g++）留在 deps 阶段，不进入最终镜像。
RUN apk add --no-cache libstdc++

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .

COPY --from=builder /app/frontend/dist ./dist

RUN mkdir -p database uploads \
    && chown -R node:node /app/database /app/uploads /app

# 以非 root 用户运行，缩小容器被攻破后的影响面
USER node

EXPOSE 3000

CMD ["npm", "start"]
