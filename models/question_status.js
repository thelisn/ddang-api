'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuestionStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  QuestionStatus.init({
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
    isCurrent: {
      type: DataTypes.INTEGER
    },
    totalUserCount: {
      type: DataTypes.INTEGER
    },
    correctUserCount: {
      type: DataTypes.INTEGER
    },
  }, {
    sequelize,
    modelName: 'QuestionStatus',
    tableName: 'question_status',
    timestamps: true,
  });

  return QuestionStatus;
};