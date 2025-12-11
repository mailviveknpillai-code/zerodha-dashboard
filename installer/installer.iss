; ============================================================================
; Zerodha Dashboard Windows Installer - Inno Setup Script
; ============================================================================
; This installer bundles:
; - dashboard-backend.exe (Spring Boot with embedded JRE)
; - frontend.exe (Electron launcher)
; - cloudflared.exe
; - Redis.msi (Redis for Windows)
; - nssm.exe (Non-Sucking Service Manager)
; - provision.ps1 (Installation script)
; ============================================================================

#define MyAppName "Zerodha Dashboard"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Your Company Name"
#define MyAppURL "https://yourdomain.com"
#define MyAppExeName "frontend.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
AppId={{A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
AppUpdatesURL={#MyAppURL}/updates
DefaultDirName={autopf}\ZerodhaDashboard
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE.txt
InfoBeforeFile=README.txt
OutputDir=dist
OutputBaseFilename=ZerodhaDashboard-Setup-{#MyAppVersion}
; SetupIconFile=icon.ico  ; Commented out - icon file not available
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1

[Files]
; Backend executable (Spring Boot with embedded JRE)
Source: "bin\dashboard-backend.exe"; DestDir: "{app}\installer\bin"; Flags: ignoreversion; Check: Is64BitInstallMode

; Frontend executable (Electron) and required DLLs
Source: "bin\frontend.exe"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "bin\ffmpeg.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "bin\d3dcompiler_47.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "bin\libEGL.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "bin\libGLESv2.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "bin\vk_swiftshader.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
; Note: vulkan-1.dll is optional and may not be present in all Electron builds
; Source: "bin\vulkan-1.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
; ICU data file and V8 snapshots (required for Electron) - using files from bin directory
Source: "bin\icudtl.dat"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "bin\v8_context_snapshot.bin"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
; Resources folder (contains app.asar - the packaged Electron app) - using files from bin directory
Source: "bin\resources\*"; DestDir: "{app}\installer\bin\resources"; Flags: ignoreversion recursesubdirs

; Cloudflared executable
Source: "bin\cloudflared.exe"; DestDir: "{app}\installer\bin"; Flags: ignoreversion

; NSSM (Non-Sucking Service Manager)
Source: "bin\nssm.exe"; DestDir: "{app}\installer\bin"; Flags: ignoreversion

; Redis MSI installer (using Redis instead of Memurai)
Source: "bin\Redis.msi"; DestDir: "{app}\installer\bin"; Flags: ignoreversion

; Provisioning script
Source: "scripts\provision.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion
Source: "scripts\provision-only.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion
Source: "scripts\provision-only.ps1"; DestDir: "{tmp}"; DestName: "provision-only.ps1"; Flags: dontcopy
Source: "scripts\complete-installation.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion

; Support utilities
Source: "scripts\collect_logs.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion
Source: "scripts\restart-services.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion

; Documentation
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\installer\bin\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\installer\bin\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\installer\bin\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
; Complete installation after files are installed (handled by CompleteInstallation function)
; Launch frontend after installation completes (only if provisioning succeeded)
Filename: "{app}\installer\bin\{#MyAppExeName}"; \
    Description: "Launch Zerodha Dashboard"; \
    Flags: nowait postinstall skipifsilent; \
    Check: (WizardIsTaskSelected('desktopicon') and GetProvisioningSucceeded)

[UninstallRun]
; Stop and remove services before uninstallation
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\scripts\uninstall.ps1"""; \
    Flags: runhidden waituntilterminated

[Code]
var
  // InstallTokenPage removed - no token required for single client
  ZerodhaConfigPage: TInputQueryWizardPage;
  ProvisioningPage: TWizardPage;
  ProvisioningLabel: TLabel;
  TunnelUrlPage: TInputQueryWizardPage;
  // InstallToken removed - no token required
  ZerodhaApiKey: String;
  ZerodhaApiSecret: String;
  StaticIp: String;
  NetworkInterface: String;
  TunnelUrl: String;
  ProvisioningSucceeded: Boolean;
  TunnelProvisioned: Boolean;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  // Show all pages
  Result := False;
end;

procedure InitializeWizard;
begin
  // InstallTokenPage removed - no token required for single client
  
  // Create custom page for Zerodha configuration (first page after welcome)
  ZerodhaConfigPage := CreateInputQueryPage(wpWelcome,
    'Zerodha API Configuration', 'Enter your Zerodha API credentials',
    'Please provide your Zerodha API credentials. These are required for the dashboard to function.');
  ZerodhaConfigPage.Add('Zerodha API Key:', False);
  ZerodhaConfigPage.Add('Zerodha API Secret:', True); // Password field
  ZerodhaConfigPage.Add('Static IP (Optional):', False);
  ZerodhaConfigPage.Add('Network Interface (Optional, e.g., eth0):', False);
  
  // Create provisioning page (opens terminal)
  ProvisioningPage := CreateCustomPage(ZerodhaConfigPage.ID,
    'Tunnel Provisioning', 
    'Starting tunnel provisioning...');
  
  ProvisioningLabel := TLabel.Create(ProvisioningPage);
  ProvisioningLabel.Caption := 'A PowerShell window will open to provision the tunnel.' + #13#10 + #13#10 +
    'Please:' + #13#10 +
    '1. Wait for the tunnel URL to appear in the PowerShell window' + #13#10 +
    '2. Copy the tunnel URL (e.g., xxxxx.cfargotunnel.com)' + #13#10 +
    '3. Click "Next" below to enter the tunnel URL';
  ProvisioningLabel.Parent := ProvisioningPage.Surface;
  ProvisioningLabel.Left := 0;
  ProvisioningLabel.Top := 0;
  ProvisioningLabel.Width := ProvisioningPage.SurfaceWidth;
  ProvisioningLabel.Height := 120;
  ProvisioningLabel.AutoSize := True;
  
  // Create tunnel URL input page
  TunnelUrlPage := CreateInputQueryPage(ProvisioningPage.ID,
    'Tunnel URL', 'Enter the tunnel URL from the PowerShell window',
    'Please paste the tunnel URL that was displayed in the PowerShell window:');
  TunnelUrlPage.Add('Tunnel URL (e.g., xxxxx.cfargotunnel.com):', False);
end;

// GetInstallToken removed - no token required

function RunProvisioningScript(): Boolean;
var
  ResultCode: Integer;
  ScriptPath: String;
  TempDir: String;
begin
  Result := True;
  TunnelProvisioned := False;
  
  // Get temp directory for script (since {app} doesn't exist yet during wizard)
  TempDir := ExpandConstant('{tmp}');
  ScriptPath := TempDir + '\provision-only.ps1';
  
  // Extract script to temp directory (file must be marked with dontcopy flag in [Files] section)
  // The filename must match the DestName in the [Files] section
  ExtractTemporaryFile('provision-only.ps1');
  
  // Run provisioning script in separate window (don't wait)
  // Use -NoExit to keep window open so user can copy the URL
  Exec('powershell.exe', 
       '-NoExit -ExecutionPolicy Bypass -File "' + ScriptPath + '" ' +
       '-VendorApiUrl "http://localhost:3000/api"',
       '', SW_SHOW, ewNoWait, ResultCode);
  
  // Don't wait for completion - user will copy URL manually
  Result := True;
end;

function ValidateTunnelUrl(Url: String): Boolean;
begin
  Result := False;
  
  // Basic validation - must contain .cfargotunnel.com
  if (Pos('.cfargotunnel.com', Url) = 0) and (Pos('cfargotunnel.com', Url) = 0) then
  begin
    MsgBox('Invalid tunnel URL. It should contain "cfargotunnel.com"', mbError, MB_OK);
    Exit;
  end;
  
  // Format is correct, allow it
  // We don't need to validate reachability during installation
  // The user has already verified the URL from the terminal
  Result := True;
end;

function CompleteInstallation(): Boolean;
var
  ResultCode: Integer;
  ScriptPath: String;
  TunnelUrlFromFile: AnsiString;
begin
  Result := True;
  
  // Use installed script path (files are installed by now)
  ScriptPath := ExpandConstant('{app}\installer\scripts\complete-installation.ps1');
  
  // Read tunnel URL from temp file
  TunnelUrlFromFile := '';
  if FileExists(ExpandConstant('{tmp}\tunnel-url.txt')) then
  begin
    if LoadStringFromFile(ExpandConstant('{tmp}\tunnel-url.txt'), TunnelUrlFromFile) then
    begin
      TunnelUrl := Trim(String(TunnelUrlFromFile));
    end
    else
    begin
      MsgBox('Failed to read tunnel URL file. Installation cannot continue.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end
  else
  begin
    MsgBox('Tunnel URL file not found. Installation cannot continue.', mbError, MB_OK);
    Result := False;
    Exit;
  end;
  
  // Run completion script with tunnel URL
  if Exec('powershell.exe', 
          '-ExecutionPolicy Bypass -File "' + ScriptPath + '" ' +
          '-ZerodhaApiKey "' + ZerodhaApiKey + '" ' +
          '-ZerodhaApiSecret "' + ZerodhaApiSecret + '" ' +
          '-StaticIp "' + StaticIp + '" ' +
          '-NetworkInterface "' + NetworkInterface + '" ' +
          '-TunnelUrl "' + TunnelUrl + '"',
          '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      ProvisioningSucceeded := True;
      Result := True;
    end
    else
    begin
      MsgBox('Failed to complete installation.' + #13#10 + #13#10 +
             'Exit code: ' + IntToStr(ResultCode) + #13#10 + #13#10 +
             'Please check the installation logs at:' + #13#10 +
             ExpandConstant('{app}\logs\install.log'),
             mbError, MB_OK);
      Result := False;
    end;
  end
  else
  begin
    MsgBox('Failed to execute completion script.', mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  // After files are installed, complete the installation
  if CurStep = ssPostInstall then
  begin
    if TunnelProvisioned then
    begin
      CompleteInstallation();
    end;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  // InstallToken page removed - no validation needed
  if CurPageID = ZerodhaConfigPage.ID then
  begin
    ZerodhaApiKey := ZerodhaConfigPage.Values[0];
    ZerodhaApiSecret := ZerodhaConfigPage.Values[1];
    StaticIp := ZerodhaConfigPage.Values[2];
    NetworkInterface := ZerodhaConfigPage.Values[3];
    
    if ZerodhaApiKey = '' then
    begin
      MsgBox('Zerodha API Key is required to continue.', mbError, MB_OK);
      Result := False;
    end
    else if ZerodhaApiSecret = '' then
    begin
      MsgBox('Zerodha API Secret is required to continue.', mbError, MB_OK);
      Result := False;
    end
    else
    begin
      // After Zerodha config, run provisioning script (non-blocking)
      RunProvisioningScript();
      // Next page will be ProvisioningPage
      Result := True;
    end;
  end
  else if CurPageID = ProvisioningPage.ID then
  begin
    // Just move to tunnel URL page - no validation needed here
    Result := True;
  end
  else if CurPageID = TunnelUrlPage.ID then
  begin
    // Validate tunnel URL
    TunnelUrl := TunnelUrlPage.Values[0];
    if TunnelUrl = '' then
    begin
      MsgBox('Tunnel URL is required to continue.', mbError, MB_OK);
      Result := False;
    end
    else
    begin
      // Clean the URL (remove https:// or http:// if present)
      // StringChange returns Integer (count), not String, so we use Pos and Copy
      if Pos('https://', TunnelUrl) = 1 then
      begin
        TunnelUrl := Copy(TunnelUrl, 9, MaxInt); // Start from position 9, take rest
      end
      else if Pos('http://', TunnelUrl) = 1 then
      begin
        TunnelUrl := Copy(TunnelUrl, 8, MaxInt); // Start from position 8, take rest
      end;
      TunnelUrl := Trim(TunnelUrl);
      
      // Validate the URL format
      if not ValidateTunnelUrl(TunnelUrl) then
      begin
        Result := False;
      end
      else
      begin
        TunnelProvisioned := True;
        // Save tunnel URL to temp file for completion script
        SaveStringToFile(ExpandConstant('{tmp}\tunnel-url.txt'), TunnelUrl, False);
        // Installation will continue to file installation, then CompleteInstallation will be called
      end;
    end;
  end;
end;

function GetZerodhaApiKey(Param: String): String;
begin
  Result := ZerodhaApiKey;
end;

function GetZerodhaApiSecret(Param: String): String;
begin
  Result := ZerodhaApiSecret;
end;

function GetStaticIp(Param: String): String;
begin
  Result := StaticIp;
end;

function GetNetworkInterface(Param: String): String;
begin
  Result := NetworkInterface;
end;

function GetProvisioningSucceeded(): Boolean;
begin
  Result := ProvisioningSucceeded;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
end;


