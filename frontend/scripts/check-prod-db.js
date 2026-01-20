const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_sZyUKu7lX2IS@ep-raspy-mode-ahjwzb3y-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function checkUser() {
    console.log("Connecting to Prod DB...");
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected.");

        console.log("Querying for 'agencia001'...");
        const res = await client.query("SELECT username, password, role FROM users WHERE username = 'agencia001' OR email = 'agencia001@gmail.com'");

        if (res.rows.length === 0) {
            console.log("RESULT: User NOT FOUND in Prod DB.");
        } else {
            console.log("RESULT: User FOUND in Prod DB.");
            console.log(JSON.stringify(res.rows[0], null, 2));

            const user = res.rows[0];
            if (user.password === 'candi') {
                console.log("PASSWORD MATCH: YES");
            } else {
                console.log("PASSWORD MATCH: NO");
                console.log(`Expected (Prod DB): '${user.password}'`);
            }
        }

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await client.end();
    }
}

checkUser();
