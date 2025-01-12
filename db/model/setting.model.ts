import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Setting extends Model {}

Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ku_port: { type: DataTypes.STRING},
    ku_baudrate: { type: DataTypes.INTEGER },
    available_slots: { type: DataTypes.INTEGER },
    max_user: { type: DataTypes.INTEGER },
    service_code: { type: DataTypes.STRING  },
  },
  {
    sequelize,
    modelName: "Setting",
    tableName: "Setting",
    createdAt: false,
    updatedAt: false,
  }
);