import { Sequelize } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: `${process.cwd()}/db/database.db`,
  logging: true,
});
