Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\Users\Risikesan\OneDrive\Desktop\FoodLoop2.0\frontend\public\logo.png"
$publicDir = "c:\Users\Risikesan\OneDrive\Desktop\FoodLoop2.0\frontend\public"

$sizes = @(
    @{ Name = "pwa-192x192.png"; Width = 192; Height = 192 },
    @{ Name = "pwa-512x512.png"; Width = 512; Height = 512 },
    @{ Name = "apple-touch-icon.png"; Width = 180; Height = 180 }
)

if (Test-Path $sourcePath) {
    Write-Host "Source image found at $sourcePath"
    $image = [System.Drawing.Image]::FromFile($sourcePath)
    
    foreach ($size in $sizes) {
        $targetPath = Join-Path $publicDir $size.Name
        Write-Host "Generating: $targetPath"
        
        $bitmap = New-Object System.Drawing.Bitmap($size.Width, $size.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # High quality scaling settings
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw source image scaled to the bitmap's dimensions
        $graphics.DrawImage($image, 0, 0, $size.Width, $size.Height)
        
        # Save output
        $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Clean up resources
        $graphics.Dispose()
        $bitmap.Dispose()
    }
    
    $image.Dispose()
    Write-Host "PWA icons generated successfully!"
} else {
    Write-Error "Source image logo.png not found at $sourcePath"
}
