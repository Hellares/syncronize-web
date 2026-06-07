# 🖨 Impresión Térmica desde la Web (QZ Tray)

Guía para configurar la impresión de tickets desde **Syncronize Web** hacia una
impresora térmica **Bluetooth** en una PC con Windows. Una vez configurado, la
web imprime ESC-POS crudo (igual que la app Flutter): corte automático, QR
SUNAT nativo y sin diálogos.

> Tiempo estimado por PC: **10-15 minutos**. Se hace **una sola vez** por computadora.

---

## Arquitectura

```
WEB (Next.js)                      ← genera los bytes ESC-POS y FIRMA la petición
   │  websocket localhost:8181/8182
   ▼
QZ TRAY (app instalada en la PC)   ← confía en nuestro certificado (override.crt)
   │  spooler de Windows (driver Generic/Text Only)
   ▼
IMPRESORA TÉRMICA                  ← emparejada por Bluetooth (puerto COM)
```

---

## Paso 1 — Emparejar la impresora térmica al Windows

1. **Apaga el Bluetooth del teléfono** (o desvincula la impresora ahí). Bluetooth
   Classic solo permite UNA conexión activa — si el teléfono la tiene, Windows no podrá.
2. Apaga y prende la impresora.
3. Windows 11: `Configuración → Bluetooth y dispositivos → Dispositivos` → baja a
   **"Configuración de detección de dispositivos"** → selecciona **"Avanzada"**
   (sin esto muchas térmicas no aparecen).
4. **Agregar dispositivo → Bluetooth** → selecciona la impresora (suele llamarse
   `BlueTooth Printer`, `MTP-II`, `POS58`, etc.).
5. Si pide PIN: prueba `0000` o `1234`.
6. ⚠ Si al final dice **"El controlador no está disponible"** → **ES NORMAL**, ignóralo.
   El emparejamiento sí funcionó; el resto lo arregla el Paso 2.

## Paso 2 — Identificar el puerto COM y crear la impresora

Abre **PowerShell como administrador** y ejecuta:

```powershell
# 2.1 — Ver los puertos COM Bluetooth y sus MAC
Get-PnpDevice -Class Ports | Where-Object { $_.FriendlyName -match 'COM' } |
  Select-Object FriendlyName, Status, InstanceId | Format-List
```

- Busca las filas con `Status: OK` cuyo `InstanceId` termina en una **MAC real**
  (ej. `...&047F0E4D1AAA_C00000000`). Las que terminan en `000000000000` son
  entrantes (ignorar).
- Para saber cuál MAC es la impresora:

```powershell
Get-PnpDevice -Class Bluetooth | Where-Object { $_.FriendlyName -match 'Printer|POS|Print' } |
  Select-Object FriendlyName, InstanceId
```

- Cruza la MAC → anota el COM (ej. `COM13`).

```powershell
# 2.2 — Crear la impresora con driver genérico (pasa los bytes tal cual)
Add-Printer -Name "Termica BT" -DriverName "Generic / Text Only" -PortName "COM13:"

# 2.3 — Probar el canal (debe salir un papelito)
"PRUEBA SYNCRONIZE`n`n`n" | Out-Printer -Name "Termica BT"
```

> Si la prueba no imprime: impresora apagada, fuera de alcance, o el teléfono
> volvió a conectarse a ella.

## Paso 3 — Instalar QZ Tray

1. Descarga: **https://qz.io/download/** (versión estable, ~90 MB con Java incluido).
2. Instala con las opciones por defecto.
3. Ábrelo (Menú Inicio → "QZ Tray"). Debe aparecer el ícono **Q** en la bandeja
   del sistema (junto al reloj; el ícono **negro es normal**).
4. Recomendado: clic derecho al ícono → habilitar inicio automático con Windows
   (o copia el acceso directo a `shell:startup`).

## Paso 4 — Instalar el certificado de Syncronize en QZ

Para que la web imprima **sin diálogos**, QZ debe confiar en nuestro certificado.
El archivo vive en el repo: `syncronize-web/qz-cert/digital-certificate.txt`.

En **PowerShell como administrador**:

```powershell
# Copia el certificado como override.crt en la carpeta de QZ
Copy-Item "<ruta>\digital-certificate.txt" "C:\Program Files\QZ Tray\override.crt" -Force

# Reinicia QZ Tray para que lo tome
Get-Process | Where-Object { $_.ProcessName -match 'javaw|qz' } | Stop-Process -Force
Start-Process "C:\Program Files\QZ Tray\qz-tray.exe"
```

> ⚠ **NUNCA borres ni edites `C:\Program Files\QZ Tray\qz-tray.properties`** —
> es la config SSL interna de QZ; sin ella QZ no arranca (aprendido a la mala).
> Solo se reemplaza `override.crt`.

## Paso 5 — Configurar la web

1. Abre cualquier venta → **Ticket** (`/dashboard/ventas/<id>/ticket`).
2. Botón **⚙** (configurar impresora):
   - Impresora: **Termica BT**
   - Ancho de papel: **58 mm** o **80 mm** (según tu rollo)
   - ✅ "Imprimir automáticamente al completar una venta" (opcional)
3. Guardar → botón **🖨 Térmica** → debe imprimir **sin ningún diálogo**.

La config queda guardada en el navegador de esa PC (localStorage).

---

## Solución de problemas

| Síntoma | Causa / Solución |
|---|---|
| "No se pudo conectar con QZ Tray" | QZ no está corriendo → ábrelo del Menú Inicio y verifica el ícono Q en la bandeja |
| Dialog **"Action Required"** en cada impresión | QZ no confía en el certificado → repetir Paso 4 (el `override.crt` no está o QZ no se reinició) |
| Log QZ dice **"Bad signature on request"** | Versión vieja del front (firma SHA1 vs SHA512) → refrescar la web con Ctrl+F5 |
| Botón queda en "Imprimiendo..." eterno | Ver el log: `%APPDATA%\qz\debug.log` (cola: `Get-Content $env:APPDATA\qz\debug.log -Tail 30`) |
| QZ no arranca | Si se borró `qz-tray.properties`: ejecutar QZ **una vez como administrador** para que lo regenere |
| Imprime basura/caracteres raros | El driver no es "Generic / Text Only" → recrear la impresora (Paso 2.2) |
| No imprime pero la cola de Windows está vacía | El trabajo no salió de QZ (permiso) — ver "Action Required" arriba |
| No imprime y la cola tiene trabajos atascados | Bluetooth caído: teléfono conectado a la impresora, o fuera de alcance → `Get-PrintJob -PrinterName "Termica BT"` para ver la cola |
| La impresora no aparece al emparejar | Detección "Avanzada" (Paso 1.3) + impresora en modo descubrible (FEED sostenido al encender en algunos modelos) |

## Verificación rápida del stack (PowerShell)

```powershell
# ¿QZ corriendo y escuchando?
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 8181,8182 }

# ¿Impresora instalada?
Get-Printer "Termica BT"

# ¿Certificado instalado?
Test-Path "C:\Program Files\QZ Tray\override.crt"

# Test directo del canal Bluetooth (sin QZ ni web)
"TEST`n`n`n" | Out-Printer -Name "Termica BT"
```

## Diagnóstico definitivo

Si nada funciona, abre **https://demo.qz.io** → conecta → selecciona la impresora
→ Print (raw):
- **El demo imprime** → el problema es nuestra web (revisar consola F12)
- **El demo tampoco** → el problema es QZ/Windows/Bluetooth (revisar esta guía)

---

## Notas técnicas

- Generador ESC-POS: `src/features/impresion/escpos.ts` (réplica del
  `ticket_venta_esc_pos_generator.dart` de Flutter — columnas 42 chars en 58mm,
  64 en 80mm, QR nativo, corte GS V).
- Firma de peticiones: `src/features/impresion/qz-service.ts` con
  `jsrsasign` (SHA512withRSA) + certificado en `qz-keys.ts` (válido 10 años,
  generado 2026-06-07 con `selfsigned`).
- QZ invoca los security handlers como **resolvers** `(resolve, reject)` — NO
  devolver promesas (cuelga todo).
- El payload raw va `{ type: 'raw', format: 'command', flavor: 'hex' }` (QZ 2.2).
