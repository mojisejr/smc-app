import { Sequelize } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: `resources/db/database.db`,
  logging: true,
});
