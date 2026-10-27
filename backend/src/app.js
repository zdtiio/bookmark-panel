require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const NodeCache = require('node-cache');

const User = require('./models/User');
const Folder = require('./models/Folder');
const Bookmark = require('./models/Bookmark');
const Config = require('./models/Config');
const ApiToken = require('./models/ApiToken');

User.hasMany(Folder, { foreignKey: 'userId', onDelete: 'CASCADE' });
Folder.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Bookmark, { foreignKey: 'userId', onDelete: 'CASCADE' });
Bookmark.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Config, { foreignKey: 'userId', onDelete: 'CASCADE' });
Config.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ApiToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
ApiToken.belongsTo(User, { foreignKey: 'userId' });

Folder.hasMany(Bookmark, { foreignKey: 'folderId', onDelete: 'SET NULL' });
Bookmark.belongsTo(Folder, { foreignKey: 'folderId' });

Folder.hasMany(Folder, { foreignKey: 'parentId', as: 'children', onDelete: 'SET NULL' });
Folder.belongsTo(Folder, { foreignKey: 'parentId', as: 'parent' });

const authRoutes = require('./routes/authRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const folderRoutes = require('./routes/folderRoutes');
const configRoutes = require('./routes/configRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const errorHandler = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/securityHeaders');
const uploadStatic = require('./middleware/uploadStatic');

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

// 不默认信任代理头，避免 X-Forwarded-For 被伪造绕过限流
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

// CORS 白名单：不再使用 cors() 全开放，防止任意站点携带用户凭据读取数据
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // 无 Origin 的同源请求、curl、以及浏览器插件发起的请求不带 Origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Token'],
  maxAge: 600
}));

app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 加固后的上传目录：禁止脚本执行、非图片类型强制降级为纯文本下载
app.use('/uploads', uploadStatic);

app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/config', configRoutes);
app.use('/api/tokens', tokenRoutes);

// 未匹配的 API 路由必须返回 JSON，不能落到前端的 index.html
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: '接口不存在',
    timestamp: new Date().toISOString()
  });
});

app.use(express.static(path.join(__dirname, '../dist'), { index: false }));

// SPA 回退：只对不带扩展名的路径返回 index.html，避免把任意路径都映射成页面
app.get('*', (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

/**
 * 启动前校验关键配置。
 * JWT_SECRET 缺失或过弱会让攻击者直接伪造任意用户身份的 Token，
 * 因此宁可拒绝启动，也不能带着不安全的默认值运行。
 */
const assertSecureConfig = () => {
  const secret = process.env.JWT_SECRET;
  const weakSecrets = [
    'your-secret-key-here-must-be-at-least-32-characters',
    'your-secret-key-change-in-production',
    'secret',
    'changeme'
  ];

  if (!secret || secret.trim().length < 32 || weakSecrets.includes(secret.trim())) {
    throw new Error(
      'JWT_SECRET 未配置或强度不足：请在 .env 中设置至少 32 位的随机字符串，' +
      '且不能使用示例中的默认值。可使用 `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"` 生成。'
    );
  }

  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
    console.warn('[security] 生产环境未配置 CORS_ORIGINS，跨域请求将被拒绝（同源访问不受影响）。');
  }
};

const startServer = async () => {
  try {
    assertSecureConfig();
    await sequelize.sync({ force: false });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('启动失败:', error.message);
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, assertSecureConfig };
