"use strict";
import config from "../config/index.js";

import mongoose from "mongoose";

const MONGODB_URI = `mongodb://${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`;

console.log("MONGODB_URI", MONGODB_URI);
class Database {
  constructor() {
    this.connect();
  }

  //connect to database
  connect(type = "mongodb") {
    if (1 === 1) {
      mongoose.set("debug", true);
      mongoose.set("debug", { color: true });
    }
    mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: 50,
      })
      .then(() => {
        console.log(`Database connection successful`);
      })
      .catch((err) => {
        console.error("Database connection error");
      });
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}

const instanceMongoDB = Database.getInstance();

export default instanceMongoDB;
