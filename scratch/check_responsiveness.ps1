$srcPath = "c:\Users\Risikesan\OneDrive\Desktop\FoodLoop2.0\frontend\src"
$cssFiles = Get-ChildItem -Path $srcPath -Filter *.css -Recurse

$issues = @()

foreach ($file in $cssFiles) {
    $content = Get-Content $file.FullName
    $inMediaQuery = $false
    $lineNum = 0
    
    foreach ($line in $content) {
        $lineNum++
        
        # Check if entering/exiting media query
        if ($line -match "@media") {
            $inMediaQuery = $true
        }
        # Note: simple curly brace tracking for media queries
        if ($inMediaQuery -and $line -match "^\s*\}\s*$") {
            $inMediaQuery = $false
        }
        
        # Heuristic 1: Fixed widths > 320px not inside media queries
        if ($line -match "^\s*(min-)?width\s*:\s*(?<val>\d+)px\s*;" -and -not $inMediaQuery) {
            $val = [int]$Matches['val']
            if ($val -gt 320) {
                $issues += [PSCustomObject]@{
                    File = $file.FullName
                    Line = $lineNum
                    IssueType = "Fixed Width > 320px ($val px)"
                    Snippet = $line.Trim()
                }
            }
        }
        
        # Heuristic 2: Absolute position with large left/right offsets
        if ($line -match "^\s*(left|right)\s*:\s*(?<val>\d+)px\s*;" -and -not $inMediaQuery) {
            $val = [int]$Matches['val']
            if ($val -gt 150) {
                $issues += [PSCustomObject]@{
                    File = $file.FullName
                    Line = $lineNum
                    IssueType = "Large Absolute Offset ($val px)"
                    Snippet = $line.Trim()
                }
            }
        }
    }
}

$issues | ConvertTo-Json -Depth 3
