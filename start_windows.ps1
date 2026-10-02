# Servidor TCP HTTP local. Windows PowerShell 5.1; no requiere permisos de administrador.
$ErrorActionPreference = 'Stop'
$labRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$labServer = $null
for ($labPort=8765; $labPort -le 8785; $labPort++) {
 try {
  $labCandidate = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $labPort)
  $labCandidate.Start()
  $labServer = $labCandidate
  break
 } catch { if ($labCandidate) { $labCandidate.Stop() } }
}
if (-not $labServer) { Write-Host 'No se pudo abrir un puerto local entre 8765 y 8785.'; exit 1 }
$labMime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.fbx'='application/octet-stream' }
$labUrl = "http://127.0.0.1:$labPort/"
Write-Host "HULK TRABAJO Y ENERGÍA: $labUrl"
Write-Host 'Mantenga esta ventana abierta. Ctrl+C para cerrar.'
Start-Process $labUrl
try {
 while ($true) {
  $labClient = $labServer.AcceptTcpClient()
  $labStream = $labClient.GetStream()
  $labStream.ReadTimeout = 5000
  try {
   $labReader = New-Object System.IO.StreamReader($labStream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
   $labRequest = $labReader.ReadLine()
   if (-not $labRequest) { continue }
   while ($null -ne ($labHeader = $labReader.ReadLine()) -and $labHeader -ne '') { }
   $labParts = $labRequest.Split(' ')
   $labUrlPath = [System.Uri]::UnescapeDataString(($labParts[1].Split('?')[0])).TrimStart('/')
   if (-not $labUrlPath) { $labUrlPath='index.html' }
   $labFile = [System.IO.Path]::GetFullPath((Join-Path $labRoot $labUrlPath))
   $labStatus = '200 OK'
   $labContentType = 'application/octet-stream'
   $labBytes = [byte[]]@()
   if ($labParts[0] -ne 'GET' -and $labParts[0] -ne 'HEAD') { $labStatus='405 Method Not Allowed' }
   elseif (-not $labFile.StartsWith($labRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { $labStatus='403 Forbidden' }
   elseif (-not [System.IO.File]::Exists($labFile)) { $labStatus='404 Not Found' }
   else {
    $labExtension = [System.IO.Path]::GetExtension($labFile).ToLowerInvariant()
    if ($labMime.ContainsKey($labExtension)) { $labContentType=$labMime[$labExtension] }
    $labBytes = [System.IO.File]::ReadAllBytes($labFile)
   }
   $labResponseHeader = "HTTP/1.1 $labStatus`r`nContent-Type: $labContentType`r`nContent-Length: $($labBytes.Length)`r`nConnection: close`r`n`r`n"
   $labHeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($labResponseHeader)
   $labStream.Write($labHeaderBytes,0,$labHeaderBytes.Length)
   if ($labParts[0] -ne 'HEAD' -and $labBytes.Length -gt 0) { $labStream.Write($labBytes,0,$labBytes.Length) }
   $labStream.Flush()
  } catch { Write-Host "Solicitud descartada: $($_.Exception.Message)" }
  finally { $labStream.Dispose(); $labClient.Close() }
 }
} finally { $labServer.Stop() }
