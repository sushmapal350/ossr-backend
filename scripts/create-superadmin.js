require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = "superadmin@gmail.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Super Admin";

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const password = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await mongoose.connection.db.collection("users").findOneAndUpdate(
      { email: ADMIN_EMAIL },
      {
        $set: {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          password,
          role: "admin",
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    const savedUser = await mongoose.connection.db
      .collection("users")
      .findOne({ email: ADMIN_EMAIL });

    console.log("Admin user ready:", {
      email: savedUser.email,
      role: savedUser.role,
      name: savedUser.name
    });
    console.log("Login password:", ADMIN_PASSWORD);
  } catch (error) {
    console.error("Failed to create admin user:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
