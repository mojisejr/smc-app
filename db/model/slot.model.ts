import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";

export class Slot extends Model {}

Slot.init(
  {
    slotId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      validate: {
        min: 1,
        max: 12, // Updated for CU12 (12 slots instead of 16)
      },
    },
    hn: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.INTEGER },
    occupied: { type: DataTypes.BOOLEAN },
    opening: { type: DataTypes.BOOLEAN },
    isActive: { type: DataTypes.BOOLEAN },
    // New fields for CU12 protocol
    lockStatus: {
      type: DataTypes.INTEGER,
      defaultValue: 1, // 0=locked, 1=unlocked
      validate: {
        min: 0,
        max: 1,
      },
    },
    errorCode: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // Error code from ASK response
    },
  },
  {
    sequelize,
    modelName: "Slot",
    tableName: "Slot",
    createdAt: false,
    updatedAt: false,
  }
);
