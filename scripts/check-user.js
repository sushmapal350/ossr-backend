require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const users = await mongoose.connection.db
      .collection("users")
      .find({ email: { $in: ["superadmin@gmail.com", "admin@gmail.com"] } })
      .project({ email: 1, role: 1, password: 1, name: 1 })
      .toArray();

    console.log(
      JSON.stringify(
        users.map((user) => ({
          email: user.email,
          role: user.role,
          name: user.name,
          hasPassword: Boolean(user.password),
          passwordLength: user.password ? user.password.length : 0
        })),
        null,
        2
      )
    );
  } catch (error) {
    console.error(error.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
