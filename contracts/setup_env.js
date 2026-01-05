const fs = require('fs');
const path = require('path');

const frontendEnvPath = path.resolve(__dirname, '../frontend/.env');
const contractsEnvPath = path.resolve(__dirname, '.env');

try {
    const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
    const lines = frontendEnv.split('\n');
    let privateKey = '';

    for (const line of lines) {
        if (line.startsWith('DEPLOYER_PRIVATE_KEY=')) {
            privateKey = line.split('=')[1].trim().replace(/^"|"$/g, '');
            break;
        }
    }

    if (!privateKey) {
        console.error('DEPLOYER_PRIVATE_KEY not found in frontend/.env');
        process.exit(1);
    }

    // Write to contracts/.env with PRIVATE_KEY
    fs.writeFileSync(contractsEnvPath, `PRIVATE_KEY=${privateKey}\n`);
    console.log('Successfully created contracts/.env with PRIVATE_KEY');

} catch (e) {
    console.error('Error setting up env:', e);
    process.exit(1);
}
