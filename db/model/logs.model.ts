import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Log extends Model {}

Log.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true },
    message: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "User",
    createdAt: false,
    updatedAt: false,
  }
);
