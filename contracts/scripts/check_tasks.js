const hre = require("hardhat");

async function main() {
    console.log("🔍 Checking both contracts for tasks...\n");

    const OLD_CONTRACT = "0x80c8316868deDc3185d5A80DAeC69c973817d135";
    const NEW_CONTRACT = "0xFd3CF1C00e6F99Eb77FC908c5B56dd899D2bCac6";

    // Check OLD contract
    console.log("📋 OLD Contract:", OLD_CONTRACT);
    try {
        const oldEscrow = await hre.ethers.getContractAt("TaskEscrow", OLD_CONTRACT);
        const oldCounter = await oldEscrow.taskCounter();
        console.log("   Task Counter:", oldCounter.toString());

        if (oldCounter > 0) {
            console.log("   ✅ Has tasks! Fetching first task...");
            const task = await oldEscrow.tasks(1);
            console.log("   Task #1 Agency:", task[1]);
            console.log("   Task #1 Reward:", task[3].toString());
        }
    } catch (e) {
        console.log("   ❌ Error:", e.message);
    }

    console.log("\n📋 NEW Contract:", NEW_CONTRACT);
    try {
        const newEscrow = await hre.ethers.getContractAt("TaskEscrow", NEW_CONTRACT);
        const newCounter = await newEscrow.taskCounter();
        console.log("   Task Counter:", newCounter.toString());

        if (newCounter > 0) {
            console.log("   ✅ Has tasks! Fetching first task...");
            const task = await newEscrow.tasks(1);
            console.log("   Task #1 Agency:", task[1]);
            console.log("   Task #1 Reward:", task[3].toString());
        }
    } catch (e) {
        console.log("   ❌ Error:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
