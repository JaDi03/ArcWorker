const fs = require('fs');
const path = require('path');

// Simulate the logic from utils/db.ts
const DB_PATH = path.join(__dirname, '../src/data/users.json');

console.log("Testing Login for: agencia001");
console.log("DB Path:", DB_PATH);

if (!fs.existsSync(DB_PATH)) {
    console.error("ERROR: users.json not found at expected path!");
    process.exit(1);
}

const content = fs.readFileSync(DB_PATH, 'utf8');
const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
let users = [];

try {
    users = JSON.parse(cleanContent);
} catch (e) {
    console.error("ERROR: Failed to parse JSON:", e.message);
    process.exit(1);
}

const targetUser = users.find(u => u.username === 'agencia001' || u.email === 'agencia001@gmail.com');

if (!targetUser) {
    console.log("RESULT: User NOT FOUND");
} else {
    console.log("RESULT: User FOUND");
    console.log("DATA:", JSON.stringify(targetUser, null, 2));

    // Simulate Check
    const inputPassword = "candi";
    if (targetUser.password === inputPassword) {
        console.log("PASSWORD CHECK: PASS");
    } else {
        console.log("PASSWORD CHECK: FAIL");
        console.log(`Expected: "${targetUser.password}"`);
        console.log(`Got:      "${inputPassword}"`);
        console.log(`Compare:  ${targetUser.password === inputPassword}`);
    }
}
