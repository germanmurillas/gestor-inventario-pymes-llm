<?php

$svgPath = __DIR__ . '/../public/icons/icon.svg';
$svgContent = file_get_contents($svgPath);
if (!$svgContent) {
    fwrite(STDERR, "Error: Cannot read icon.svg\n");
    exit(1);
}

function renderIcon($size, $outputPath, $svgContent) {
    $img = imagecreatetruecolor($size, $size);
    imagesavealpha($img, true);
    imagealphablending($img, true);
    $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
    imagefill($img, 0, 0, $transparent);

    $renderer = svgToRaster($svgContent, $size, $size);
    if ($renderer === false) {
        $fallback = generateFallbackIcon($size);
        imagepng($fallback, $outputPath);
        imagedestroy($fallback);
        imagedestroy($img);
        return;
    }

    list($raster, $subImg) = $renderer;
    imagecopyresampled($img, $subImg, 0, 0, 0, 0, $size, $size, $size, $size);
    imagedestroy($subImg);
    imagepng($img, $outputPath);
    imagedestroy($img);
}

function generateFallbackIcon($size) {
    $img = imagecreatetruecolor($size, $size);
    imagesavealpha($img, true);
    imagealphablending($img, true);
    $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
    imagefill($img, 0, 0, $transparent);

    $bg = imagecolorallocate($img, 10, 10, 11);
    $indigo = imagecolorallocate($img, 99, 102, 241);
    $gold = imagecolorallocate($img, 201, 168, 76);
    $indigoDim = imagecolorallocatealpha($img, 99, 102, 241, 80);

    $r = $size * 0.18;
    $pad = $size * 0.05;

    imagefilledroundedrect($img, $pad, $pad, $size - $pad, $size - $pad, $size * 0.1875, $bg);

    $cx = $size / 2;
    $cy = $size * 0.38;
    $hr = $size * 0.16;
    imageellipse($img, $cx, $cy, $hr * 2, $hr * 2, $indigo);

    $bodyTop = $size * 0.52;
    $bodyBot = $size * 0.73;
    $bodyLeft = $size * 0.31;
    $bodyRight = $size * 0.69;
    $bodyW = abs($bodyRight - $bodyLeft);
    $bodyH = abs($bodyBot - $bodyTop);
    imagearc($img, $cx, $bodyTop + $bodyH * 0.2, $bodyW, $bodyH * 1.4, 180, 360, $indigo);

    $lineY = $bodyTop + $bodyH * 0.25;
    imageline($img, $bodyLeft, $lineY, $bodyRight, $lineY, $gold);
    imagesetthickness($img, max(1, $size * 0.015));
    imageline($img, $bodyLeft, $lineY, $bodyRight, $lineY, $gold);
    imagesetthickness($img, 1);

    imagepng($img, $size >= 192 ? $outputPath : null);
    imagedestroy($img);
    return $img;
}

function imagefilledroundedrect($img, $x1, $y1, $x2, $y2, $radius, $color) {
    $radius = min($radius, floor(($x2 - $x1) / 2), floor(($y2 - $y1) / 2));
    if ($radius <= 0) {
        imagefilledrectangle($img, $x1, $y1, $x2, $y2, $color);
        return;
    }
    imagefilledrectangle($img, $x1 + $radius, $y1, $x2 - $radius, $y2, $color);
    imagefilledrectangle($img, $x1, $y1 + $radius, $x2, $y2 - $radius, $color);
    imagefilledellipse($img, $x1 + $radius, $y1 + $radius, $radius * 2, $radius * 2, $color);
    imagefilledellipse($img, $x2 - $radius, $y1 + $radius, $radius * 2, $radius * 2, $color);
    imagefilledellipse($img, $x1 + $radius, $y2 - $radius, $radius * 2, $radius * 2, $color);
    imagefilledellipse($img, $x2 - $radius, $y2 - $radius, $radius * 2, $radius * 2, $color);
}

function svgToRaster($svgContent, $width, $height) {
    $tmpSvg = tempnam(sys_get_temp_dir(), 'icon_') . '.svg';
    $tmpPng = tempnam(sys_get_temp_dir(), 'icon_') . '.png';
    file_put_contents($tmpSvg, $svgContent);

    $cmd = sprintf(
        'inkscape --export-type=png --export-filename=%s --export-width=%d --export-height=%d %s 2>/dev/null || rsvg-convert -w %d -h %d -o %s %s 2>/dev/null || convert -background none -density 300 -resize %dx%d %s %s 2>/dev/null',
        escapeshellarg($tmpPng), $width, $height, escapeshellarg($tmpSvg),
        $width, $height, escapeshellarg($tmpPng), escapeshellarg($tmpSvg),
        $width, $height, escapeshellarg($tmpSvg), escapeshellarg($tmpPng)
    );

    exec($cmd, $output, $ret);

    $result = false;
    if ($ret === 0 && file_exists($tmpPng) && filesize($tmpPng) > 0) {
        $subImg = imagecreatefrompng($tmpPng);
        if ($subImg) {
            $result = [$subImg, $subImg];
        }
    }

    @unlink($tmpSvg);
    if (!isset($subImg)) @unlink($tmpPng);

    return $result;
}

$iconsDir = __DIR__ . '/../public/icons';
if (!is_dir($iconsDir)) mkdir($iconsDir, 0755, true);

renderIcon(192, $iconsDir . '/icon-192.png', $svgContent);
renderIcon(512, $iconsDir . '/icon-512.png', $svgContent);

echo "Icons generated successfully.\n";
echo "  icon-192.png: " . (file_exists($iconsDir . '/icon-192.png') ? filesize($iconsDir . '/icon-192.png') . ' bytes' : 'FAILED') . "\n";
echo "  icon-512.png: " . (file_exists($iconsDir . '/icon-512.png') ? filesize($iconsDir . '/icon-512.png') . ' bytes' : 'FAILED') . "\n";
