#!/bin/sh
# 容器入口脚本。
#
# 目的：解决 bind mount 下挂载目录属主不匹配导致 SQLite 只读的问题。
#
# 背景：
#   Dockerfile 中以 chown -R node:node /app/database /app/uploads 设置了属主，
#   但 docker-compose 的 bind mount（./database:/app/database）会完全覆盖
#   镜像内的目录，镜像里的 chown 不生效。
#   若宿主机目录属主是 root（旧版本以 root 运行创建的），而容器内以
#   node（uid 1000）运行，则目录可读不可写 —— 表现为能登录、能查看，
#   但任何修改都报 "attempt to write a readonly database"。
#
# 做法：
#   以 root 启动本脚本 -> 修正挂载目录属主 -> 降权到 node 用户运行应用。
#   若容器本身以非 root 启动（如 compose 里指定了 user:），则跳过修正，
#   直接运行。
set -e

# 解析数据库目录与上传目录（与后端 process.env 的取值保持一致）
DB_FILE="${DB_PATH:-./database/bookmarks.db}"
DB_DIR="$(dirname "$DB_FILE")"
UPLOAD_DIR="${UPLOAD_PATH:-./uploads}"

if [ "$(id -u)" = "0" ]; then
  for dir in "$DB_DIR" "$UPLOAD_DIR"; do
    # 防护：避免 DB_PATH 只写文件名时 dirname 得到 "."，导致误改整个 /app
    case "$dir" in
      "" | "." | "/")
        echo "[entrypoint] 跳过可疑目录 '$dir'（DB_PATH/UPLOAD_PATH 应包含目录部分）" >&2
        continue
        ;;
    esac

    [ -d "$dir" ] || mkdir -p "$dir" 2>/dev/null || true
    if [ -d "$dir" ]; then
      if ! chown -R node:node "$dir" 2>/dev/null; then
        echo "[entrypoint] 警告: 无法修改 $dir 的属主。" >&2
        echo "[entrypoint] 若使用只读挂载，请改为可写，或在宿主机执行:" >&2
        echo "[entrypoint]   chown -R 1000:1000 <宿主机上的 database 与 uploads 目录>" >&2
      fi
    fi
  done

  # 降权到 node 用户运行（su-exec 是 Alpine 上对应 gosu 的轻量实现）
  exec su-exec node "$@"
fi

# 已经是非 root（例如 compose 指定了 user:），直接运行
exec "$@"
