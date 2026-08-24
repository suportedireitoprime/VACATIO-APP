; Hook customizado do NSIS chamado pelo electron-builder.
; Registra o app em HKCU (chave "legítima" que apps comerciais também gravam),
; o que ajuda a construir reputação no SmartScreen.

!macro customInstall
  WriteRegStr HKCU "Software\Vacatio\VadeMecum" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\Vacatio\VadeMecum" "Version" "${VERSION}"
  WriteRegStr HKCU "Software\Vacatio\VadeMecum" "Publisher" "Vacatio"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Vacatio\VadeMecum"
!macroend
