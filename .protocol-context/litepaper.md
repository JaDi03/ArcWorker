# Litepaper: ArcWorker Protocol

## 1. Resumen Ejecutivo
ArcWorker es un mercado descentralizado de micro-tareas construido sobre Arc Network que cierra la brecha entre la demanda laboral de Web2 y la eficiencia financiera de Web3. Al aprovechar las Programmable Wallets de Circle y la finalidad de sub-segundo de Arc, eliminamos las fricciones del mercado actual de $400B: latencia de pago, umbrales mínimos de retiro y tarifas excesivas.

## 2. El Problema: "La Trampa de Liquidez de Web2"
Las plataformas actuales sufren de:
- **Latencia de Pago**: Los trabajadores esperan más de 30 días para recibir sus fondos.
- **Barreras de Umbral**: No se puede retirar dinero hasta alcanzar montos altos ($10-$20), lo que representa semanas de trabajo en economías emergentes.
- **Exclusión Financiera**: Las tarifas bancarias tradicionales hacen que los micro-pagos (ej. $0.10) sean inviables.

## 3. La Solución: El Motor ArcWorker
- **Para Trabajadores**: Pago instantáneo en USDC y experiencia sin gas.
- **Para Agencias**: Alcance global sin burocracia bancaria y confianza programática mediante Escrow.
- **Eficiencia de Capital**: Los fondos excedentes generan rendimiento vía USYC (Circle/BlackRock RWA).

## 4. Arquitectura Técnica
- **Identidad**: Login estilo Web2 (Social/Email) que crea una billetera MPC invisible (Circle).
- **Ejecución**: Smart Contracts en Arc EVM con finalidad casi instantánea.
- **Liquidez**: USDC nativo y CCTP para transferencias sin riesgo de puente.
- **Motor FX**: Integración con StableFX para retiros rápidos a moneda local.

## 5. Modelo de Negocio (Crecimiento Sostenible)
- **Spread de Tarea**: Comisión del 5-10% sobre la diferencia entre el pago de la Agencia y la recompensa al Trabajador.
- **Generación de Rendimiento**: Uso de USYC para el "float" de fondos en el protocolo.
- **Spread de FX**: Comisiones mínimas por conversión de moneda vía el puente StableFX.
