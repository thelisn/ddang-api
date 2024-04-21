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
      this.belongsTo(models.User)
    }
  }

  UserAnswer.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    UserId: {
      type: DataTypes.INTEGER
    },
    QuestionId: {
      type: DataTypes.INTEGER
    },
    AnswerId: {
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