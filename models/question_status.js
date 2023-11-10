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
    questionId: {
      type: DataTypes.INTEGER
    },
    totalUserCount: {
      type: DataTypes.INTEGER
    },
    correctUserCount: {
      type: DataTypes.INTEGER
    },
    deletedAt: {
      type: DataTypes.STRING(45)
    },
  }, {
    sequelize,
    modelName: 'QuestionStatus',
    tableName: 'question_status',
    timestamps: false,
  });

  return QuestionStatus;
};