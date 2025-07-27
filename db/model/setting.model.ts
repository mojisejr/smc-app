import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Setting extends Model {}

Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // CU12 Hardware Configuration (12-slot system)
    cu_port: { type: DataTypes.STRING },
    cu_baudrate: { type: DataTypes.INTEGER, defaultValue: 19200 },
    
    // Legacy KU16 Configuration (15-slot system) - kept for backward compatibility
    ku_port: { type: DataTypes.STRING },
    ku_baudrate: { type: DataTypes.INTEGER },
    
    // System Configuration
    available_slots: { type: DataTypes.INTEGER, defaultValue: 12 },
    max_user: { type: DataTypes.INTEGER },
    service_code: { type: DataTypes.STRING },
    max_log_counts: { type: DataTypes.INTEGER },
    organization: { type: DataTypes.STRING },
    customer_name: { type: DataTypes.STRING },
    activated_key: { type: DataTypes.STRING },
    
    // Indicator Device Configuration
    indi_port: { type: DataTypes.STRING },
    indi_baudrate: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    modelName: "Setting",
    tableName: "Setting",
    createdAt: false,
    updatedAt: false,
  }
);
