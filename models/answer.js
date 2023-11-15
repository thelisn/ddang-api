'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Answer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  Answer.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.INTEGER
    },
    questionId: {
      type: DataTypes.INTEGER
    },
    number: {
      type: DataTypes.INTEGER
    },
    text: {
      type: DataTypes.STRING(200)
    }
  }, {
    sequelize,
    modelName: 'Answer',
    tableName: 'answer',
    timestamps: true,
  });

  return Answer;
};