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
      this.belongsTo(models.Question)
    }
  }

  QuestionStatus.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    EventId: {
      type: DataTypes.INTEGER
    },
    QuestionId: {
      type: DataTypes.INTEGER
    },
    isCurrent: {
      type: DataTypes.BOOLEAN
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