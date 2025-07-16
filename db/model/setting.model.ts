import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Setting extends Model {}

Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Renamed from KU16 to CU12
    cu_port: { type: DataTypes.STRING }, // Renamed from ku_port
    cu_baudrate: { type: DataTypes.INTEGER }, // Renamed from ku_baudrate
    cu_address: { type: DataTypes.INTEGER, defaultValue: 0x00 }, // New CU12 device address
    available_slots: { type: DataTypes.INTEGER, defaultValue: 12 }, // Updated for 12 slots
    max_user: { type: DataTypes.INTEGER },
    service_code: { type: DataTypes.STRING },
    max_log_counts: { type: DataTypes.INTEGER },
    organization: { type: DataTypes.STRING },
    customer_name: { type: DataTypes.STRING },
    activated_key: { type: DataTypes.STRING },
    indi_port: { type: DataTypes.STRING },
    indi_baudrate: { type: DataTypes.INTEGER },
    // CU12 specific settings
    unlock_time: {
      type: DataTypes.INTEGER,
      defaultValue: 550, // Default unlock time (550 * 10ms = 5.5s)
    },
    delayed_unlock: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // Delayed unlock time in seconds
    },
    push_door_wait: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // Push door wait time in seconds
    },
  },
  {
    sequelize,
    modelName: "Setting",
    tableName: "Setting",
    createdAt: false,
    updatedAt: false,
  }
);
