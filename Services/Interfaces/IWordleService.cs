using FutArg11.Models.Enums;

public interface IWordleService
{
    string ObtenerPalabraObjetivo();
    
    List<WordleLetraEstado> ValidarIntento(string palabraObjetivo, string intento);
}
