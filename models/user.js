'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.INTEGER
    },
    teamId: {
      type: DataTypes.INTEGER
    },
    einumber: {
      type: DataTypes.STRING(45)
    },
    name: {
      type: DataTypes.STRING(45)
    },
    isAdmin: {
      type: DataTypes.BOOLEAN
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    timestamps: true,
  });

  return User;
};