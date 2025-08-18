import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Setting extends Model {}

Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ku_port: { type: DataTypes.STRING },
    ku_baudrate: { type: DataTypes.INTEGER },
    available_slots: { type: DataTypes.INTEGER },
    max_user: { type: DataTypes.INTEGER },
    service_code: { type: DataTypes.STRING },
    max_log_counts: { type: DataTypes.INTEGER },
    organization: { type: DataTypes.STRING },
    customer_name: { type: DataTypes.STRING },
    activated_key: { type: DataTypes.STRING },
    indi_port: { type: DataTypes.STRING },
    indi_baudrate: { type: DataTypes.INTEGER },
    device_type: { type: DataTypes.STRING, defaultValue: "DS12" },
  },
  {
    sequelize,
    modelName: "Setting",
    tableName: "Setting",
    createdAt: false,
    updatedAt: false,
  }
);
