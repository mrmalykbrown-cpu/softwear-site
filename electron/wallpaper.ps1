# Set the Windows desktop wallpaper to $Path (prepended by the caller).
# Uses SystemParametersInfo(SPI_SETDESKWALLPAPER) and sets a "Fill" style.

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PrismWall {
  [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
  public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@

try {
  Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name WallpaperStyle -Value '10' -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name TileWallpaper  -Value '0'  -ErrorAction SilentlyContinue
  # SPI_SETDESKWALLPAPER = 20 ; SPIF_UPDATEINIFILE(1) | SPIF_SENDWININICHANGE(2) = 3
  [PrismWall]::SystemParametersInfo(20, 0, $Path, 3) | Out-Null
  Write-Output 'ok'
}
catch {
  Write-Output 'err'
}
