import { Sequelize } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: `resources/db/database.db`,
  logging: false,
  pool: {
    max: 1,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    match: [/SQLITE_BUSY/, /database is locked/],
    max: 3,
  },
});
