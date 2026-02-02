Add-Type -AssemblyName System.Drawing

$baseIconPath = "c:/Users/rakosu/Desktop/VaxTrace/frontend/public/icons/icon-144x144.png"
$iconsDir = "c:/Users/rakosu/Desktop/VaxTrace/frontend/public/icons/"
$baseIcon = [System.Drawing.Image]::FromFile($baseIconPath)

$sizes = @(96, 128, 152, 192, 384, 512)

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($baseIcon, 0, 0, $size, $size)
    $outputPath = Join-Path $iconsDir "icon-${size}x${size}.png"
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $g.Dispose()
    Write-Host "Created icon-${size}x${size}.png"
}

$baseIcon.Dispose()
Write-Host "All icons created successfully!"
