# Invoke-WebRequest-Script.ps1

# Definir la URL
$url = 'https://incvalsiefore-xxibqqnal-qa.sishergon.com.mx/States/workflows'

# Definir los headers
$headers = @{
    "accept" = "/"
    "Content-Type" = "application/json"
}

# Definir el body de la solicitud
$body = @{
    type = "Sincronización manual de información."
} | ConvertTo-Json

# Realizar la solicitud POST
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop
    
    # Mostrar el código de estado
    Write-Host "Código de estado: $($response.StatusCode)"
    
    # Mostrar el contenido de la respuesta
    Write-Host "Respuesta del servidor:"
    Write-Host $response.Content
}
catch {
    Write-Host "Error al realizar la solicitud:"
    Write-Host $_.Exception.Message
}