param(
    [string]$SdkRoot = "$env:APPDATA\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.2.0-2026-06-09-92a1605b2",
    [string]$Device = 'venu445mm'
)

$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$compiler = Join-Path $SdkRoot 'bin\monkeyc.bat'
$key = Join-Path $env:APPDATA 'Garmin\ConnectIQ\developer_key.der'
if (-not (Test-Path -LiteralPath $compiler)) { throw "Connect IQ compiler not found: $compiler" }
if (-not (Test-Path -LiteralPath $key)) { throw "Developer key not found: $key" }

foreach ($test in @('verify.cjs', 'verify-preview.cjs', 'verify-play-preview.cjs')) {
    Push-Location $project
    try {
        & node $test
        if ($LASTEXITCODE -ne 0) { throw "Test failed: $test" }
    } finally { Pop-Location }
}

foreach ($app in @(
    @{ Folder = 'ciq'; Output = "bin\Emote-$Device.prg" },
    @{ Folder = 'ciq-play'; Output = "bin\EmotePlay-$Device.prg" }
)) {
    Push-Location (Join-Path $project $app.Folder)
    try {
        & $compiler -f monkey.jungle -d $Device -o $app.Output -y $key -O 2 -r
        if ($LASTEXITCODE -ne 0) { throw "Build failed: $($app.Folder)" }
    } finally { Pop-Location }
}
