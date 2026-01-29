import { closePool, execute } from "./db";

async function main() {
  try {
    const result = await execute(
      "UPDATE candidates SET image_url = '/default-avatar.svg' WHERE image_url LIKE 'http%'",
    );
    console.log(`Updated ${result.affectedRows} candidates.`);
  } catch (error) {
    console.error("Error updating avatars:", error);
  } finally {
    await closePool();
  }
}

main();
