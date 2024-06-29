import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Log extends Model {}

Log.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user: { type: DataTypes.STRING},
    message: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    modelName: "Log",
    tableName: "Log",
    createdAt: true,
    updatedAt: false,
  }
);
