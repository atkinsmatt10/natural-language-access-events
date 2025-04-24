import { sql } from '@vercel/postgres';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import "dotenv/config"

export async function seed() {
  // Create access_events table
  const createTable = await sql`
    CREATE TABLE IF NOT EXISTS access_events (
      id SERIAL PRIMARY KEY,
      door_name VARCHAR(255) NOT NULL,
      controller_name VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      local_timestamp TIMESTAMP(6) NOT NULL,
      code VARCHAR(255) NOT NULL,
      credential_type VARCHAR(255) NOT NULL
    );
  `;

  console.log(`Created "access_events" table`);

  const results: any[] = [];
  const csvFilePath = path.join(process.cwd(), 'access_events.csv');

  // Verify file exists before attempting to read
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at ${csvFilePath}`);
  }

  // Read and parse CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  // Insert data into PostgreSQL
  for (const row of results) {
    try {
      await sql`
        INSERT INTO access_events (
          door_name,
          controller_name,
          first_name,
          last_name,
          full_name,
          local_timestamp,
          code,
          credential_type
        ) VALUES (
          ${row.door_name},
          ${row.controller_name},
          ${row.first_name},
          ${row.last_name},
          ${row.full_name},
          TO_TIMESTAMP(${row.local_timestamp}, 'YYYY-MM-DD HH24:MI:SS.US'),
          ${row.code},
          ${row.credential_type}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    } catch (error) {
      console.error('Error inserting row:', row, error);
    }
  }

  console.log(`Seeded ${results.length} access events`);
  return {
    createTable,
    accessEvents: results,
  };
}

seed().catch(console.error);