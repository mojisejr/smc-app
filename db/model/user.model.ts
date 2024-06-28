import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class User extends Model {}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true },
    passkey: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "User",
    createdAt: false,
    updatedAt: false,
  }
);
