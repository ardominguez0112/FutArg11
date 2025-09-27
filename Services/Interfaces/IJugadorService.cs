using FutArg11.Models.Entities;

namespace FutArg11.Services.Interfaces
{
    public interface IJugadorService
    {
        Jugador ObtenerJugadorAleatorio();
        List<Jugador> LeerJugadores();
    }
}
