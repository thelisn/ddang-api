'use strict';
const { Model } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  Team.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    color: {
      type: DataTypes.STRING(45)
    },
    name: {
      type: DataTypes.STRING(45)
    },
  }, {
    sequelize,
    modelName: 'Team',
    tableName: 'team',
    timestamps: false,
  });

  return Team;
};