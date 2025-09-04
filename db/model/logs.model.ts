import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";

export class Log extends Model {}

Log.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    logType: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: 'system',
      comment: 'Log category: system, build, license, hardware, error, debug'
    },
    component: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: 'unknown',
      comment: 'Source component: main-process, license-validator, esp32-client, build-prep, etc.'
    },
    level: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: 'info',
      comment: 'Log level: info, warn, error, debug'
    },
    metadata: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'JSON string for additional context and debugging information'
    },
  },
  {
    sequelize,
    modelName: "Log",
    tableName: "Log",
    createdAt: true,
    updatedAt: false,
  }
);
