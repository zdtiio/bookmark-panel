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

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.sync({ force: false });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
