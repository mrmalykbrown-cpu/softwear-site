# Read the current Windows "now playing" session (System Media Transport
# Controls) and print it as one line of JSON. Works with Spotify, the Apple
# Music app, browsers, Groove, etc. — anything that publishes SMTC metadata.

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

# Helper to synchronously await a WinRT IAsyncOperation<T>.
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
function Await($op, $type) {
  $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $task.Wait(-1) | Out-Null
  $task.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

try {
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $session = $mgr.GetCurrentSession()
  if ($null -eq $session) {
    Write-Output '{"access":true,"playing":false,"position":0,"duration":0}'
  }
  else {
    $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $timeline = $session.GetTimelineProperties()
    $info = $session.GetPlaybackInfo()
    $playing = ($info.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing)
    $pos = [math]::Round($timeline.Position.TotalSeconds)
    $dur = [math]::Round($timeline.EndTime.TotalSeconds)

    $art = $null
    try {
      if ($props.Thumbnail) {
        $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        $size = [uint32]$stream.Size
        if ($size -gt 0) {
          $reader = [Windows.Storage.Streams.DataReader]::new($stream)
          Await ($reader.LoadAsync($size)) ([uint32]) | Out-Null
          $bytes = New-Object byte[] $size
          $reader.ReadBytes($bytes)
          $art = 'data:image/png;base64,' + [Convert]::ToBase64String($bytes)
        }
      }
    }
    catch { $art = $null }

    $obj = [ordered]@{
      access   = $true
      playing  = $playing
      title    = $props.Title
      artist   = $props.Artist
      position = $pos
      duration = $dur
      app      = $session.SourceAppUserModelId
      art      = $art
    }
    Write-Output ($obj | ConvertTo-Json -Compress -Depth 4)
  }
}
catch {
  Write-Output '{"access":false,"playing":false,"position":0,"duration":0}'
}
