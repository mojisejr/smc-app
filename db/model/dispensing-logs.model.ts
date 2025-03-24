import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import { User } from "./user.model";
import { Slot } from "./slot.model";

export class DispensingLog extends Model {}

DispensingLog.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    timestamp: { type: DataTypes.INTEGER },
    userId: { type: DataTypes.INTEGER },
    slotId: { type: DataTypes.INTEGER },
    hn: { type: DataTypes.TEXT },
    process: { type: DataTypes.TEXT },
    message: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    modelName: "DispensingLog",
    tableName: "DispensingLog",
    createdAt: true,
    updatedAt: false,
  }
);

DispensingLog.belongsTo(User, { foreignKey: "userId" });
