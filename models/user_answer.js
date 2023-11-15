'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAnswer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  UserAnswer.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER
    },
    questionId: {
      type: DataTypes.INTEGER
    },
    answerId: {
      type: DataTypes.INTEGER
    },
  }, {
    sequelize,
    modelName: 'UserAnswer',
    tableName: 'user_answer',
    timestamps: true,
  });

  return UserAnswer;
};