// Prisma error codes that mean "cannot talk to the database"
const DB_ERROR_CODES = new Set([
    "P1000", // authentication failed against the database server
    "P1001", // can't reach the database server
    "P1002", // database server timed out
    "P1003", // database does not exist
    "P1008", // operation timed out
    "P1017", // server closed the connection
    "P2024", // timed out fetching a connection from the pool
]);

export function isDatabaseConnectionError(err) {
    if (!err) return false;

    if (err.name === "PrismaClientInitializationError") return true;
    if (err.name === "PrismaClientRustPanicError") return true;
    if (DB_ERROR_CODES.has(err.code)) return true;

    const msg = String(err.message || "");
    return /can't reach database server|ECONNREFUSED|ETIMEDOUT|connection (refused|terminated|closed)|timed out fetching a new connection/i.test(
        msg
    );
}

export const DB_DOWN_MESSAGE =
    "Database is not connected. Please connect the database and try again.";