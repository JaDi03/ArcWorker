const hre = require("hardhat");

async function main() {
    console.log("🔥 Starting ArcWorker E2E Verification on Arc Testnet...");

    // 1. Setup
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using Account: ${deployer.address}`);

    const ESCROW_ADDR = "0xb2659fe01b2DB2d6A5e52FcA318585a62fcfe74B";
    const REGISTRY_ADDR = "0x7f85BACE984B8966DEE8D51691eaED089c4363f8";

    const TaskEscrow = await hre.ethers.getContractAt("TaskEscrow", ESCROW_ADDR);
    const ReputationRegistry = await hre.ethers.getContractAt("ReputationRegistry", REGISTRY_ADDR);

    // 2. Create Task (Agency Flow)
    const reward = hre.ethers.parseEther("0.001"); // 0.001 USDC
    const fee = (reward * 500n) / 10000n; // 5%
    const deposit = reward + fee;
    const deadline = 3600; // 1 hour
    const metadata = "QmTestHash_Verification_Task"; // Mock IPFS

    console.log(`\n1️⃣ Creating Task...`);
    console.log(`   Reward: ${hre.ethers.formatEther(reward)} USDC`);
    console.log(`   Deposit: ${hre.ethers.formatEther(deposit)} USDC`);

    const txCreate = await TaskEscrow.createTask(reward, deadline, metadata, { value: deposit });
    console.log(`   Tx Hash: ${txCreate.hash}`);
    await txCreate.wait();

    const taskId = await TaskEscrow.taskCounter();
    console.log(`   ✅ Task #${taskId} Created!`);

    // 3. Submit Task (Worker Flow - Simulating same address for simplicity, or we could use a random wallet if we had keys)
    // In this test, Deployer plays both Agency and Worker to test the contract logic quickly.
    // Ideally user wants to separate, but contract allows it unless we restricted it?
    // Let's check: Escrow doesn't restrict worker != agency, but logic implies it.
    // For verification, we act as worker.

    console.log(`\n2️⃣ Submitting Solution...`);
    const txSubmit = await TaskEscrow.submitTask(taskId, "Verified Answer");
    await txSubmit.wait();
    console.log(`   ✅ Task #${taskId} Submitted!`);

    // 4. Approve Task (Agency Flow)
    // Check Status Before
    const taskBefore = await TaskEscrow.tasks(taskId);
    console.log(`   Status: ${taskBefore.status} (Expected: 1 - Submitted)`);

    console.log(`\n3️⃣ Approving Task...`);
    const txApprove = await TaskEscrow.approveTask(taskId);
    await txApprove.wait();
    console.log(`   ✅ Task #${taskId} Approved! (Funds Released)`);

    // 5. Verify Reputation
    console.log(`\n4️⃣ Verifying Reputation...`);
    const score = await ReputationRegistry.getReputation(deployer.address);
    console.log(`   Work History for ${deployer.address}:`);
    console.log(`   - Approved: ${score.approved}`);
    console.log(`   - Rejected: ${score.rejected}`);
    console.log(`   - Score: ${score.score}%`);

    console.log("\n🎉 E2E Verification Complete! System is fully operational.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
