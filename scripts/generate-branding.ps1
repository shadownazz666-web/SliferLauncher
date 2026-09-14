# Generates Slifer icon source art and NSIS installer bitmaps.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$icons = Join-Path $root "src-tauri\icons"
$packaging = Join-Path $root "src-tauri\packaging"
New-Item -ItemType Directory -Force -Path $icons, $packaging | Out-Null

function New-Graphics([System.Drawing.Image]$image) {
    $graphics = [System.Drawing.Graphics]::FromImage($image)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    return $graphics
}

function Add-SliferMark([System.Drawing.Graphics]$graphics, [int]$size) {
    $pad = [int]($size * 0.08)
    $box = New-Object System.Drawing.Rectangle($pad, $pad, ($size - $pad * 2), ($size - $pad * 2))
    $radius = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($box.X, $box.Y, $d, $d, 180, 90)
    $path.AddArc($box.Right - $d, $box.Y, $d, $d, 270, 90)
    $path.AddArc($box.Right - $d, $box.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($box.X, $box.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    $fill = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $box,
        [System.Drawing.Color]::FromArgb(255, 22, 8, 12),
        [System.Drawing.Color]::FromArgb(255, 10, 6, 8),
        90
    )
    $graphics.FillPath($fill, $path)

    $ring = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $box,
        [System.Drawing.Color]::FromArgb(255, 255, 77, 97),
        [System.Drawing.Color]::FromArgb(255, 232, 195, 106),
        45
    )
    $pen = New-Object System.Drawing.Pen($ring, [float]($size * 0.03))
    $graphics.DrawPath($pen, $path)

    $body = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $box,
        [System.Drawing.Color]::FromArgb(255, 255, 57, 80),
        [System.Drawing.Color]::FromArgb(255, 155, 16, 32),
        45
    )
    $s = [float]$size
    $wing = @(
        (New-Object System.Drawing.PointF(($s * 0.28), ($s * 0.64))),
        (New-Object System.Drawing.PointF(($s * 0.40), ($s * 0.78))),
        (New-Object System.Drawing.PointF(($s * 0.62), ($s * 0.74))),
        (New-Object System.Drawing.PointF(($s * 0.76), ($s * 0.54))),
        (New-Object System.Drawing.PointF(($s * 0.58), ($s * 0.58))),
        (New-Object System.Drawing.PointF(($s * 0.66), ($s * 0.36))),
        (New-Object System.Drawing.PointF(($s * 0.50), ($s * 0.40))),
        (New-Object System.Drawing.PointF(($s * 0.38), ($s * 0.50)))
    )
    $graphics.FillPolygon($body, $wing)

    $gold = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 232, 195, 106), [float]($size * 0.028))
    $gold.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $gold.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($gold, ($s * 0.38), ($s * 0.50), ($s * 0.66), ($s * 0.42))

    $fill.Dispose()
    $ring.Dispose()
    $pen.Dispose()
    $body.Dispose()
    $path.Dispose()
    $gold.Dispose()
}

$icon = New-Object System.Drawing.Bitmap 1024, 1024
$g = New-Graphics $icon
$g.Clear([System.Drawing.Color]::FromArgb(255, 7, 6, 10))
Add-SliferMark $g 1024
$g.Dispose()
$iconPath = Join-Path $icons "icon-source.png"
$icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()

$header = New-Object System.Drawing.Bitmap 150, 57
$hg = New-Graphics $header
$hg.Clear([System.Drawing.Color]::FromArgb(255, 12, 8, 12))
$hg.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 225, 29, 46))), 0, 0, 6, 57)
$font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 232, 195, 106))
$ivoryBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 246, 241, 234))
$hg.DrawString("SLIFER", $font, $goldBrush, 14, 8)
$small = New-Object System.Drawing.Font("Segoe UI", 8)
$hg.DrawString("Launcher Setup", $small, $ivoryBrush, 14, 30)
$hg.Dispose()
$header.Save((Join-Path $packaging "nsis-header.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
$header.Dispose()

$sidebar = New-Object System.Drawing.Bitmap 164, 314
$sg = New-Graphics $sidebar
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, 164, 314)),
    [System.Drawing.Color]::FromArgb(255, 18, 8, 12),
    [System.Drawing.Color]::FromArgb(255, 7, 6, 10),
    90
)
$sg.FillRectangle($bg, 0, 0, 164, 314)
Add-SliferMark $sg 140
$title = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$sg.DrawString("SLIFER", $title, $goldBrush, 36, 168)
$caption = New-Object System.Drawing.Font("Segoe UI", 8)
$sg.DrawString("Windows Game Launcher", $caption, $ivoryBrush, 14, 194)
$sg.Dispose()
$sidebar.Save((Join-Path $packaging "nsis-sidebar.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
$sidebar.Dispose()

$font.Dispose()
$small.Dispose()
$title.Dispose()
$caption.Dispose()
$goldBrush.Dispose()
$ivoryBrush.Dispose()
$bg.Dispose()

Write-Host "Wrote $iconPath and NSIS bitmaps in $packaging"
