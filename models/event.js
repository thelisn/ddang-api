'use strict';
const { Model } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  Event.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    note: {
      type: DataTypes.STRING(200)
    },
    isEnd: {
      type: DataTypes.BOOLEAN
    },
  }, {
    sequelize,
    modelName: 'Event',
    tableName: 'event',
    timestamps: true,
  });

  return Event;
};