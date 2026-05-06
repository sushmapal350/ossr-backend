const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

require("dotenv").config();
if (!process.env.MONGODB_URI) {
  require("dotenv").config({ path: ".env.local" });
}

const DEFAULT_PORT = 27017;
const DEFAULT_HOSTS = new Set(["127.0.0.1", "localhost"]);
const STARTUP_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 500;

function parseMongoConnectionTarget(mongoUri) {
  if (!mongoUri || !mongoUri.startsWith("mongodb://")) {
    return null;
  }

  const withoutScheme = mongoUri.slice("mongodb://".length);
  const authority = withoutScheme.split("/")[0];
  const firstHost = authority.split(",")[0];
  const hostPart = firstHost.includes("@") ? firstHost.split("@").pop() : firstHost;
  const [host, port] = hostPart.split(":");

  return {
    host: host || "127.0.0.1",
    port: Number(port || DEFAULT_PORT)
  };
}

function canAutoStartMongo(target) {
  return (
    target &&
    DEFAULT_HOSTS.has(target.host) &&
    Number.isInteger(target.port) &&
    target.port > 0
  );
}

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (isOpen) => {
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(1000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function findMongoBinary() {
  if (process.env.MONGOD_PATH && fs.existsSync(process.env.MONGOD_PATH)) {
    return process.env.MONGOD_PATH;
  }

  const baseDir = path.join("C:", "Program Files", "MongoDB", "Server");
  if (!fs.existsSync(baseDir)) {
    return null;
  }

  const versions = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));

  for (const version of versions) {
    const candidate = path.join(baseDir, version, "bin", "mongod.exe");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await checkPort(host, port)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}

async function main() {
  const target = parseMongoConnectionTarget(process.env.MONGODB_URI);

  if (!canAutoStartMongo(target)) {
    console.log("[MongoDB] Skipping local auto-start because MONGODB_URI is not a localhost connection.");
    return;
  }

  if (await checkPort(target.host, target.port)) {
    console.log(`[MongoDB] Already reachable at ${target.host}:${target.port}.`);
    return;
  }

  const mongoBinary = findMongoBinary();
  if (!mongoBinary) {
    console.error("[MongoDB] mongod.exe was not found. Install MongoDB or set MONGOD_PATH.");
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, "..");
  const dbPath = path.join(projectRoot, ".mongodb-data");
  const logDir = path.join(projectRoot, ".mongodb-log");
  const logPath = path.join(logDir, "mongod.log");

  fs.mkdirSync(dbPath, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  fs.closeSync(fs.openSync(logPath, "a"));

  console.log(`[MongoDB] Starting local mongod from ${mongoBinary}...`);

  const mongoProcess = spawn(
    mongoBinary,
    [
      "--dbpath",
      dbPath,
      "--logpath",
      logPath,
      "--bind_ip",
      target.host === "localhost" ? "127.0.0.1" : target.host,
      "--port",
      String(target.port)
    ],
    {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore"
    }
  );

  mongoProcess.unref();

  const isReachable = await waitForPort(target.host, target.port, STARTUP_TIMEOUT_MS);
  if (!isReachable) {
    console.error(`[MongoDB] Failed to start within ${STARTUP_TIMEOUT_MS}ms. Check ${logPath}.`);
    process.exit(1);
  }

  console.log(`[MongoDB] Ready at ${target.host}:${target.port}.`);
}

main().catch((error) => {
  console.error("[MongoDB] Auto-start failed:", error.message);
  process.exit(1);
});