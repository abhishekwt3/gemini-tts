const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usage = sequelize.define('Usage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  monthYear: {
    type: DataTypes.STRING(7), // Format: YYYY-MM
    allowNull: false
  },
  charactersUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  apiCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  audioGenerated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  voicesUsed: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  languagesUsed: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'month_year']
    }
  ]
});

module.exports = Usage;