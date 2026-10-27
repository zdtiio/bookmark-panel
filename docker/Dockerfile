# 固定到具体补丁版本，避免构建结果随上游浮动，也便于安全审计与回滚。
# 从 node:20 升级到 Node.js 24.22.1（当前 LTS "Krypton"）。
FROM node:24.22.1-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build

FROM node:24.22.1-alpine

WORKDIR /app

COPY backend/package*.json ./

# 以非 root 用户运行，缩小容器被攻破后的影响面
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/ .

COPY --from=builder /app/frontend/dist ./dist

RUN mkdir -p database uploads \
    && chown -R node:node /app/database /app/uploads /app

USER node

EXPOSE 3000

CMD ["npm", "start"]
