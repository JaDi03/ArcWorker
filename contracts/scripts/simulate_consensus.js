const { ethers } = require("hardhat");

async function main() {
    const [admin, agency, worker1, worker2, worker3] = await ethers.getSigners();
    console.log("\n====================================================");
    console.log("   SIMULACIÓN: CONSENSO Y GOLDEN SET - ARCWORKER");
    console.log("====================================================\n");

    // 1. DESPLIEGUE
    console.log("1. Desplegando infraestructura local...");
    const MockVault = await ethers.getContractFactory("MockYieldVault");
    const vault = await MockVault.deploy();
    await vault.waitForDeployment();

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    const reputation = await Reputation.deploy();
    await reputation.waitForDeployment();

    const Escrow = await ethers.getContractFactory("TaskEscrow");
    const escrow = await Escrow.deploy(await reputation.getAddress(), await vault.getAddress());
    await escrow.waitForDeployment();

    // Configurar permisos
    await reputation.setTaskEscrow(await escrow.getAddress());
    console.log("✅ Contratos listos. Escrow vinculado a Reputation.\n");

    const reward = ethers.parseUnits("1.0", 6); // 1.00 USDC
    const fee = (reward * 500n) / 10000n; // 5% fee
    const costPerSubmission = reward + fee;

    // --- TEST 1: GOLDEN SET (FALLO) ---
    console.log("2. Escenario: Golden Set - Respuesta Incorrecta");
    const correctAnswer = "perro";

    // En V6 keccak256 recibe bytes, usamos solidityPackedKeccak256 o similar
    const correctAnswerHash = ethers.solidityPackedKeccak256(["string"], [correctAnswer]);

    // Crear tarea Golden Set (1 worker)
    await escrow.connect(agency).createTasksBatch(
        reward,
        1,
        3600,
        "metadata_golden",
        1,
        correctAnswerHash,
        { value: costPerSubmission }
    );
    const goldenTaskId = await escrow.taskCounter();
    console.log(`   - Tarea Golden Set creada (ID: ${goldenTaskId.toString()})`);

    console.log(`   - Trabajador 1 envía respuesta errónea: "gato"`);
    await escrow.connect(worker1).submitTask(goldenTaskId, "gato");

    let sub0 = await escrow.taskSubmissions(goldenTaskId, 0);
    console.log(`   - Resultado: La entrega está ${sub0.approved ? "✅ APROBADA" : "⏳ PENDIENTE (Correcto)"}`);

    // --- TEST 2: GOLDEN SET (ÉXITO) ---
    console.log("\n3. Escenario: Golden Set - Respuesta CORRECTA (Auto-Aprobación)");
    // El trabajador 1 ya participó en esa tarea, usamos Worker 2 en una nueva
    await escrow.connect(agency).createTasksBatch(reward, 1, 3600, "metadata_golden_hit", 1, correctAnswerHash, { value: costPerSubmission });
    const hitTaskId = await escrow.taskCounter();

    const balanceBefore = await escrow.savingsShares(worker2.address);
    console.log(`   - Trabajador 2 envía: "${correctAnswer}"`);
    await escrow.connect(worker2).submitTask(hitTaskId, correctAnswer);

    const balanceAfter = await escrow.savingsShares(worker2.address);
    const subHit = await escrow.taskSubmissions(hitTaskId, 0);

    if (subHit.approved && balanceAfter > balanceBefore) {
        console.log("   - Resultado: ✅ AUTO-APROBADO Y PAGADO INSTANTÁNEAMENTE.");
    } else {
        console.log("   - Resultado: ❌ Error en auto-aprobación.");
    }

    // --- TEST 3: CONSENSO (MULTIPLE WORKERS) ---
    console.log("\n4. Escenario: Consenso (3 Trabajadores Requeridos)");
    const required = 3n;
    const totalCost = costPerSubmission * required;

    await escrow.connect(agency).createTasksBatch(
        reward,
        1,
        3600,
        "metadata_consensus",
        required,
        ethers.ZeroHash,
        { value: totalCost }
    );
    const consensusId = await escrow.taskCounter();

    console.log(`   - Trabajador 1 envía respuesta...`);
    await escrow.connect(worker1).submitTask(consensusId, "A");
    console.log(`   - Trabajador 2 envía respuesta...`);
    await escrow.connect(worker2).submitTask(consensusId, "A");

    let task = await escrow.tasks(consensusId);
    console.log(`   - Progreso: ${task.currentSubmissions}/${task.requiredSubmissions}. Estado: ${task.status == 0n ? "Created" : "Other"}`);

    console.log(`   - Trabajador 3 envía respuesta (Cupo lleno)...`);
    await escrow.connect(worker3).submitTask(consensusId, "B");

    task = await escrow.tasks(consensusId);
    console.log(`   - Resultado: ${task.currentSubmissions}/${task.requiredSubmissions}. Estado: ${task.status == 1n ? "✅ Submitted (Review Ready)" : "❌ Error"}`);

    console.log("\n====================================================");
    console.log("   SIMULACIÓN COMPLETADA EXITOSAMENTE");
    console.log("====================================================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
