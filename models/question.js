"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {}
  }

  Question.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      number: {
        type: DataTypes.INTEGER,
      },
      question: {
        type: DataTypes.STRING(200),
      },
      type: {
        type: DataTypes.STRING(45),
      },
      correctAnswer: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: "Question",
      tableName: "question",
      timestamps: false,
    }
  );

  return Question;
};
