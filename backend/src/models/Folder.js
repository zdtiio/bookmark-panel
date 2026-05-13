const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Folder = sequelize.define('Folder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    {
      name: 'idx_folder_user_parent',
      fields: ['userId', 'parentId']
    },
    {
      name: 'idx_folder_user_sort',
      fields: ['userId', 'sortOrder']
    }
  ]
});

module.exports = Folder;
