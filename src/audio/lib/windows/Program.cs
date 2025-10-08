// Build: dotnet publish -r win-x64 -c Release --self-contained true /p:PublishTrimmed=false
// Always outputs JSON: {"playing":false,"sources":[]}

using System;
using System.Collections.Generic;
using System.Text.Json;
using Windows.Media.Control;

public class MediaState
{
    public bool playing { get; set; }
    public string[] sources { get; set; } = Array.Empty<string>();
}

class Program
{
    static int Main()
    {
        var result = new MediaState(); // default values

        try
        {
            var mgr = GlobalSystemMediaTransportControlsSessionManager
                .RequestAsync()
                .GetAwaiter()
                .GetResult();

            var sessions = mgr.GetSessions();
            var sources = new List<string>();

            foreach (var s in sessions)
            {
                try
                {
                    var info = s.GetPlaybackInfo();
                    if (info?.PlaybackStatus ==
                        GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                        result.playing = true;

                    var id = s.SourceAppUserModelId;
                    if (!string.IsNullOrEmpty(id))
                        sources.Add(id);
                }
                catch { /* skip unresponsive */ }
            }

            result.sources = sources.ToArray();
        }
        catch (Exception ex)
        {
            // still output valid JSON, even on failure
            Console.Error.WriteLine($"[MediaState] {ex.Message}");
        }

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        try
        {
            var json = JsonSerializer.Serialize(result, options);
            Console.WriteLine(json);
        }
        catch (Exception ex)
        {
            // Fallback minimal JSON, never empty
            Console.WriteLine("{\"playing\":false,\"sources\":[]}");
            Console.Error.WriteLine($"[MediaState:FATAL] {ex.Message}");
        }

        return 0;
    }
}
