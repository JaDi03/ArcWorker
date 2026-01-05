# ArcWorker Protocol: Vision & Strategy
> De plataforma de tareas a layer de integración

## 1. Resumen Ejecutivo
ArcWorker Protocol empieza como un marketplace descentralizado de microtareas y freelance (el "Upwork/MTurk onchain"), pero su visión final es ser la **infraestructura** que habilita la economía gig en cualquier aplicación de la Arc Network.

**Cambio de Enfoque:**
- **Antes:** "Hacer tareas nosotros" (App vertical)
- **Ahora:** "Infraestructura para tareas, pagos y reputación" (Protocolo horizontal)

## 2. Componentes del Layer de Integración
### 📦 ArcWorker UI Kit ("Gig-in-a-Box")
*Componentes frontend listos para usar (React/Next.js).*
- **ConnectModal:** Botón de entrada universal. Gestiona tanto la creación de cuentas "invisibles" (Circle) como la conexión de wallets Web3 (MetaMask/Rabby).
- **TaskFeed Widget:** Lista de tareas embebible. Permite a cualquier proyecto (DAO, Juego, AI Startup) mostrar ofertas de trabajo *dentro* de su propia web sin que el usuario salga.
    - *Caso de Uso:* Un juego Web3 necesita beta testers. Incrusta `<TaskFeed tag="testing" />` en su lobby. Los jugadores ganan USDC sin salir del juego.

### 💼 Wallet Strategy: Hybrid Model
*Lo mejor de dos mundos.*
1.  **Circle Programmable Wallets (Web2/Newbies):**
    - Para usuarios sin experiencia crypto. Login con Email/Social.
    - Custodia invisible, sin seed phrases.
    - Ideal para scale-up masivo.
2.  **Bring Your Own Wallet (BYOW):**
    - Soporte nativo para EIP-1193 (MetaMask, Rabby, Rainbow).
    - Para power users que ya tienen reputación y fondos.
    - **No pasan por AuthModule**, interactúan directo con los contratos.

## 3. Modelo de Negocio y Revenue
**¿Cómo cobramos si usan su propia wallet?**
El modelo de ingresos es **Protocol-Level**, no "App-Level".
1.  **Transaction Fees (Escrow):** El Smart Contract cobra un % (ej. 5-10%) automáticamente al liberar los fondos de una tarea.
    - *Independiente del Wallet:* No importa si el worker usa Circle o MetaMask. El contrato retiene el fee on-chain antes de enviar el pago final.
2.  **SaaS / API Fees:** Cobro a plataformas por uso intensivo del SDK (volumen alto de peticiones off-chain).
3.  **Yield Sharing:** Revenue share de los fondos en custodia (Circle Yield).

## 4. Mecánicas de Rendimiento (Treasury)
ArcWorker transforma el capital ocioso (sueldos no reclamados, depósitos de agencias) en activos productivos.

### Testnet (Simulación)
En nuestro entorno de pruebas (Arc Testnet), utilizamos un contrato **MockYieldVault**.
- **Funcionamiento:** Simula un APY del 5%.
- **Mecánica:** Cuando un usuario retira fondos, el contrato calcula el interés generado por el tiempo transcurrido y **acuña (mints)** nuevos tokens MockUSDC para cubrir la diferencia.
- **Objetivo:** Validar la UX de "High-Yield Savings" sin depender de integraciones externas complejas.

### Mainnet (Real World Assets)
En producción, el `MockYieldVault` se reemplaza por bóvedas ERC-4626 reales que invierten en:
- **RWA (Real World Assets):** Bonos del Tesoro de EE.UU. tokenizados (ej. BlackRock BUIDL).
- **DeFi Blue Chips:** Protocolos de préstamo sobrecolateralizados (Aave, Compound).
Esto convierte a ArcWorker en una cuenta de ahorros programable para la Gig Economy.

## 5. Contratos Desplegados (Arc Testnet)
Infraestructura activa en la red de pruebas.

| Contrato | Dirección | Propósito |
| :--- | :--- | :--- |
| **TaskEscrow** | `0x159caF55c0B8c276b7DaEbd0000ECA3372b2b674` | Custodia de fondos, pagos y lógica de ahorro. |
| **ReputationRegistry** | `0x83576d234F1c7609950577D4Bc22DaDc9790554D` | SBTs (Soulbound Tokens) de historial laboral. |
| **MockYieldVault** | `0x3D41581afB396Bfde885FeFf2A3265485Cdf69b6` | Bóveda ERC-4626 simulada (5% APY). |
| **UserRegistry** | `0x6a4dDceA0b7304Aab5c5bE34e42A0faD7700BD2B` | Mapeo de Identidad (Username <-> Address). |
