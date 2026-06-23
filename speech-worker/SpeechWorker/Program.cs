using System;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Windows.Media.SpeechRecognition;

public class SpeechResult
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("text")] public string? Text { get; set; }
    [JsonPropertyName("error")] public string? Error { get; set; }
}

[JsonSerializable(typeof(SpeechResult))]
internal partial class AppJsonContext : JsonSerializerContext { }

class Program
{
    static async Task<int> Main(string[] args)
    {
        string culture = "pt-BR";

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--culture" && i + 1 < args.Length) culture = args[i + 1];
        }

        try
        {
            SpeechRecognizer recognizer;
            try { recognizer = new SpeechRecognizer(new Windows.Globalization.Language(culture)); }
            catch { recognizer = new SpeechRecognizer(); }

            recognizer.Constraints.Add(new SpeechRecognitionTopicConstraint(SpeechRecognitionScenario.Dictation, "dictation"));

            var compile = await recognizer.CompileConstraintsAsync();
            if (compile.Status != SpeechRecognitionResultStatus.Success)
                return WriteResult(success: false, error: $"Falha ao compilar: {compile.Status}");

            recognizer.Timeouts.InitialSilenceTimeout = TimeSpan.FromSeconds(60);
            recognizer.Timeouts.EndSilenceTimeout = TimeSpan.FromSeconds(1);

            while (true)
            {
                var result = await recognizer.RecognizeAsync();
                if (result.Status == SpeechRecognitionResultStatus.Success && !string.IsNullOrWhiteSpace(result.Text))
                    WriteResult(success: true, text: result.Text);
            }
        }
        catch (Exception ex)
        {
            return WriteResult(success: false, error: ex.Message);
        }
    }

    static int WriteResult(bool success, string? text = null, string? error = null)
    {
        Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(
            new SpeechResult { Success = success, Text = text, Error = error },
            AppJsonContext.Default.SpeechResult));
        return success ? 0 : 1;
    }
}
