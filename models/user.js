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
      this.belongsTo(models.Team)
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    EventId: {
      type: DataTypes.INTEGER
    },
    TeamId: {
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