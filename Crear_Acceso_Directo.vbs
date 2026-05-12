Set oWS = WScript.CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")
sCurrentDir = oFSO.GetParentFolderName(WScript.ScriptPosition)
sLinkFile = oWS.SpecialFolders("Desktop") & "\MicroGrid Optimizer.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = sCurrentDir & "\Iniciar_Software.bat"
oLink.WorkingDirectory = sCurrentDir
oLink.Description = "Iniciar MicroGrid Optimizer v2.0"
oLink.IconLocation = "C:\Windows\System32\shell32.dll, 25" ' Un icono de red/computadora más profesional
oLink.Save
WScript.Echo "¡Acceso directo creado en el escritorio exitosamente!"
