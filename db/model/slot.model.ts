import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";

export class Slot extends Model {}

Slot.init(
  {
    slotId: { type: DataTypes.INTEGER, primaryKey: true },
    hn: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.INTEGER },
    occupied: { type: DataTypes.INTEGER },
    isActive: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    modelName: "Slot",
    tableName: "Slot",
    createdAt: false,
    updatedAt: false,
  }
);
