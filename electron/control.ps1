# Control the active SMTC session. $Action is prepended by the caller and is one
# of: play | pause | playpause | next | prev | seek  (seek uses $Position, secs).

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

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

try {
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $s = $mgr.GetCurrentSession()
  if ($null -ne $s) {
    switch ($Action) {
      'play' { Await ($s.TryPlayAsync()) ([bool]) | Out-Null }
      'pause' { Await ($s.TryPauseAsync()) ([bool]) | Out-Null }
      'playpause' { Await ($s.TryTogglePlayPauseAsync()) ([bool]) | Out-Null }
      'next' { Await ($s.TrySkipNextAsync()) ([bool]) | Out-Null }
      'prev' { Await ($s.TrySkipPreviousAsync()) ([bool]) | Out-Null }
      'seek' {
        $ticks = [int64]([double]$Position * 10000000)
        Await ($s.TryChangePlaybackPositionAsync($ticks)) ([bool]) | Out-Null
      }
    }
  }
}
catch { }
