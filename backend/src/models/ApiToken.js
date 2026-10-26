const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const ApiToken = sequelize.define('ApiToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

ApiToken.hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
};

ApiToken.prototype.compareToken = async function(rawToken) {
  if (!this.token || !rawToken) return false;
  const expected = Buffer.from(ApiToken.hashToken(rawToken));
  const actual = Buffer.from(this.token);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
};

module.exports = ApiToken;
