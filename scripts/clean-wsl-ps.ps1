(Get-Content .\deploy\windows.ps1 -Raw -Encoding UTF8) `
  -replace '[\u200B-\u200F\uFEFF]', '' |
  Set-Content .\deploy\windows.ps1 -Encoding UTF8
