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
Source: "bin\vulkan-1.dll"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
; ICU data file and V8 snapshots (required for Electron)
Source: "electron-launcher\dist\win-unpacked\icudtl.dat"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "electron-launcher\dist\win-unpacked\snapshot_blob.bin"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "electron-launcher\dist\win-unpacked\v8_context_snapshot.bin"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
; Chrome resource .pak files (required for Electron)
Source: "electron-launcher\dist\win-unpacked\chrome_100_percent.pak"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "electron-launcher\dist\win-unpacked\chrome_200_percent.pak"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
Source: "electron-launcher\dist\win-unpacked\resources.pak"; DestDir: "{app}\installer\bin"; Flags: ignoreversion
; Resources folder (contains app.asar - the packaged Electron app)
Source: "electron-launcher\dist\win-unpacked\resources\*"; DestDir: "{app}\installer\bin\resources"; Flags: ignoreversion recursesubdirs

; Cloudflared executable
Source: "bin\cloudflared.exe"; DestDir: "{app}\installer\bin"; Flags: ignoreversion

; NSSM (Non-Sucking Service Manager)
Source: "bin\nssm.exe"; DestDir: "{app}\installer\bin"; Flags: ignoreversion

; Redis MSI installer (using Redis instead of Memurai)
Source: "bin\Redis.msi"; DestDir: "{app}\installer\bin"; Flags: ignoreversion

; Provisioning script
Source: "scripts\provision.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion

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
; Run provisioning script after installation
; Note: The actual execution is handled by RunProvisioningScript function
; This entry is kept for reference but the function handles retries
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\scripts\provision.ps1"" -InstallToken ""{code:GetInstallToken}"""; \
    StatusMsg: "Configuring services..."; \
    Flags: waituntilterminated; \
    Description: "Setting up services and Cloudflare tunnel"; \
    Check: RunProvisioningScript
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
  InstallTokenPage: TInputQueryWizardPage;
  InstallToken: String;
  ProvisioningSucceeded: Boolean;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;

procedure InitializeWizard;
begin
  // Create custom page for install token input
  InstallTokenPage := CreateInputQueryPage(wpWelcome,
    'Installation Token', 'Please enter your installation token',
    'Enter the installation token provided by your administrator:');
  InstallTokenPage.Add('Install Token:', False);
end;

function GetInstallToken(Param: String): String;
begin
  Result := InstallToken;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = InstallTokenPage.ID then
  begin
    InstallToken := InstallTokenPage.Values[0];
    if InstallToken = '' then
    begin
      MsgBox('Installation token is required to continue.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function RunProvisioningScript(): Boolean;
var
  ResultCode: Integer;
  RetryCount: Integer;
  MaxRetries: Integer;
  UserChoice: Integer;
begin
  Result := True;
  ProvisioningSucceeded := False;
  RetryCount := 0;
  MaxRetries := 3;
  
  while RetryCount < MaxRetries do
  begin
    if RetryCount > 0 then
    begin
      UserChoice := MsgBox('Installation failed. Would you like to retry?' + #13#10 + #13#10 +
                            'Attempt ' + IntToStr(RetryCount + 1) + ' of ' + IntToStr(MaxRetries),
                            mbError, MB_YESNO);
      if UserChoice = IDNO then
      begin
        Result := False;
        Exit;
      end;
    end;
    
    // Run PowerShell script with visible window for user interaction
    // Note: The PowerShell script has its own retry mechanism, so this is a fallback
    // Use localhost for local development, or set environment variable for production
    if Exec('powershell.exe', 
            '-ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\installer\scripts\provision.ps1') + '" -InstallToken "' + InstallToken + '" -VendorApiUrl "http://localhost:3000/api"',
            '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
    begin
      if ResultCode = 0 then
      begin
        // Success
        ProvisioningSucceeded := True;
        Result := True;
        Exit;
      end
      else
      begin
        // Script returned error code
        RetryCount := RetryCount + 1;
        if RetryCount < MaxRetries then
        begin
          // Will retry on next iteration
        end
        else
        begin
          // Max retries reached
          MsgBox('Installation failed after ' + IntToStr(MaxRetries) + ' attempts.' + #13#10 + 
                 'Exit code: ' + IntToStr(ResultCode) + #13#10 + #13#10 +
                 'Please check the installation logs at:' + #13#10 +
                 ExpandConstant('{app}\logs\install.log') + #13#10 + #13#10 +
                 'You can also manually run the installation script:' + #13#10 +
                 ExpandConstant('{app}\installer\scripts\provision.ps1') + #13#10 + #13#10 +
                 'The installation files have been copied. You can retry the installation' + #13#10 +
                 'by running the script manually.',
                 mbError, MB_OK);
          Result := False;
          Exit;
        end;
      end;
    end
    else
    begin
      // Failed to execute PowerShell
      RetryCount := RetryCount + 1;
      if RetryCount < MaxRetries then
      begin
        // Will retry on next iteration
      end
      else
      begin
        MsgBox('Failed to execute installation script.' + #13#10 + #13#10 +
               'Please ensure PowerShell is available and try again.' + #13#10 + #13#10 +
               'You can manually run the installation script:' + #13#10 +
               ExpandConstant('{app}\installer\scripts\provision.ps1'),
               mbError, MB_OK);
        Result := False;
        Exit;
      end;
    end;
  end;
end;

function GetProvisioningSucceeded(): Boolean;
begin
  Result := ProvisioningSucceeded;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
end;

