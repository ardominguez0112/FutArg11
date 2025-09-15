namespace FutArg11.Models.Entities
{
    public class Jugador
    {
        public string NombreCompleto { get; set; }
        public string Apellido
        {
            get
            {
                if (string.IsNullOrWhiteSpace(NombreCompleto)) return "";
                var partes = NombreCompleto.Split(' ');
                if (partes.Length == 2) return partes[1];
                if (partes.Length >= 3) return string.Join(' ', partes.Skip(1)); // o Skip(partes.Length - 2)
                return NombreCompleto;
            }
        }
        public string Nacionalidad { get; set; }
        public List<Club> Clubes { get; set; }
    }
}
