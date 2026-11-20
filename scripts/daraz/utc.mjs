// Import this FIRST in any script that writes to the database.
//
// The site (Prisma) stores every timestamp as UTC in "timestamp without time zone" columns. The pg
// driver would otherwise write a JS Date in this machine's local time (the VPS is on Nepal time),
// and SQL now() would follow the database's own zone, leaving script-written rows 5h45m off from
// what the site reads back. Working in UTC on both sides keeps them equal.
process.env.TZ = 'UTC'

/** Call once after connecting, so SQL now() is UTC for this session too. */
export const useUtc = db => db.query(`SET TIME ZONE 'UTC'`)
