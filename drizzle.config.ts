import { defineConfig } from "drizzle-kit"
import path from "path"

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(process.cwd(), "data", "ai-writer.db"),
  },
})
