import { MongoClient, ServerApiVersion, Db } from "mongodb";
import "dotenv/config";

const uri = process.env.DB_HOST ?? "";
if (!uri) {
  throw new Error("DB_HOST environment variable is not set");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db: Db | null = null;

export const connectToDatabase = async () => {
  if (db) return db;
  try {
    await client.connect();
    db = client.db("marketdb");
    await db.command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    throw err;
  }
};

export const getDb = (): Db => {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() at app startup.");
  }
  return db;
};

export { client };
