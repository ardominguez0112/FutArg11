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

                var partes = NombreCompleto.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (partes.Length == 1) return partes[0];

                var conectores = new[] { "da", "de", "del", "di", "dos", "do", "van", "von", "mac", "mc", "la" };

                // Caso especial: sufijo Jr o Sr → mantenemos apellido + sufijo
                if (partes.Last().Equals("jr", StringComparison.OrdinalIgnoreCase) ||
                    partes.Last().Equals("sr", StringComparison.OrdinalIgnoreCase))
                {
                    return $"{partes[^2]} {partes[^1]}"; // Ej: "Vinicius Jr"
                }

                // Buscar apellido desde el final hacia atrás, incluyendo conectores
                var apellidoPartes = new List<string> { partes[^1] }; // siempre incluimos la última palabra
                int i = partes.Length - 2;

                while (i >= 0 && conectores.Contains(partes[i].ToLower()))
                {
                    apellidoPartes.Insert(0, partes[i]); // agregamos al inicio
                    i--;
                }

                // Si no hay conectores, tomamos solo la última palabra (apellido normal)
                return string.Join(' ', apellidoPartes);
            }
        }
        public string Nacionalidad { get; set; }
        public List<Club> Clubes { get; set; }
    }
}
