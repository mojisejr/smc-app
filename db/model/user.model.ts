import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class User extends Model {
  public id!: number;
  public name!: string;
  public role!: string;
  public passkey!: string;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING},
    role: { type: DataTypes.STRING },
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
