require("dotenv").config();
if (!process.env.MONGODB_URI) {
  require("dotenv").config({ path: ".env.local" });
}

const http = require("http");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

function createAppServer() {
  return http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        message: "Job portal backend is running"
      })
    );
  });
}

connectDB()
  .then(() => {
    const server = createAppServer();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed due to DB connection error:", error.message);
    process.exit(1);
  });
