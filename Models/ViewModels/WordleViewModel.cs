namespace FutArg11.Models.ViewModels
{
    public class WordleViewModel
    {
        public string ApellidoObjetivo { get; set; }
        public int IntentosRestantes { get; set; }
        public List<WordleIntento> Intentos { get; set; } = new();
        public string IntentoActual { get; set; }
    }

    public class WordleIntento
    {
        public string Texto { get; set; }
        public List<WordleLetra> Letras { get; set; }
    }

    public class WordleLetra
    {
        public char Letra { get; set; }
        public string Estado { get; set; } // "correcta", "presente", "ausente"
    }
}
