'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAlive extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  UserAlive.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER
    },
    deletedAt: {
      type: DataTypes.STRING(45)
    },
    einumber: {
      type: DataTypes.STRING(45)
    },
  }, {
    sequelize,
    modelName: 'UserAlive',
    tableName: 'user_alive',
    timestamps: false,
  });

  return UserAlive;
};