FROM node:20-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm install

COPY frontend/ ./

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install --production

COPY backend/ .

COPY --from=builder /app/frontend/dist ./dist

RUN mkdir -p database uploads

EXPOSE 3000

CMD ["npm", "start"]