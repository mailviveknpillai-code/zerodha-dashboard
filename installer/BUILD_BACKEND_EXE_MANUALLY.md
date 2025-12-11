# Building Backend EXE Manually with Launch4j

If the automated script fails, you can build `dashboard-backend.exe` manually using Launch4j GUI.

## Steps

1. **Build the Backend JAR first:**
   ```powershell
   cd backend\dashboard
   ..\mvnw.cmd clean package -DskipTests
   ```
   This creates: `backend\dashboard\target\dashboard-app-0.0.1-SNAPSHOT.jar`

2. **Open Launch4j GUI:**
   - Navigate to: `C:\vivek\New folder\Launch4j\`
   - Run: `launch4j.exe`

3. **Configure Launch4j:**
   - **Output file:** `C:\vivek\freelance\zerodha-dashboard\installer\bin\dashboard-backend.exe`
   - **Jar:** `C:\vivek\freelance\zerodha-dashboard\backend\dashboard\target\dashboard-app-0.0.1-SNAPSHOT.jar`
   - **Header type:** GUI
   - **JRE:**
     - Min version: `21` (Java 21 - use new version scheme)
     - Runtime bits: `64`
   - **Do NOT set:** errTitle, manifest, icon (leave empty or don't add)

4. **Build:**
   - Click "Build wrapper" button
   - The EXE will be created in `installer\bin\dashboard-backend.exe`

5. **Continue with script:**
   ```powershell
   .\installer\rebuild-all-v1.1.0.ps1 -SkipLaunch4j
   ```

## Alternative: Use Existing Working Config

If you have a working Launch4j config from a previous build:
1. Copy it to: `installer\launch4j\launch4j-config.xml`
2. Update the JAR path in the config to point to the new JAR
3. Run Launch4j with that config

