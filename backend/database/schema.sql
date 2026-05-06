-- ============================================
-- Bookmark Panel - 数据库表结构
-- 数据库类型: SQLite
-- 表由 Sequelize ORM 自动同步生成 (sync)
-- 此文件仅用于参考，实际建表由 Model 定义驱动
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS Users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文件夹表（支持多级嵌套）
CREATE TABLE IF NOT EXISTS Folders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    parentId    INTEGER REFERENCES Folders(id) ON DELETE SET NULL,
    sortOrder   INTEGER NOT NULL DEFAULT 0,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 书签表
CREATE TABLE IF NOT EXISTS Bookmarks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    folderId    INTEGER REFERENCES Folders(id) ON DELETE SET NULL,
    title       VARCHAR(255) NOT NULL,
    url         VARCHAR(1024) NOT NULL,
    description TEXT,
    icon        VARCHAR(512),
    sortOrder   INTEGER NOT NULL DEFAULT 0,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 配置表（用户自定义配置键值对）
CREATE TABLE IF NOT EXISTS Configs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    key         VARCHAR(100) NOT NULL,
    value       TEXT,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API 令牌表
CREATE TABLE IF NOT EXISTS ApiTokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(100),
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastUsedAt  DATETIME
);
