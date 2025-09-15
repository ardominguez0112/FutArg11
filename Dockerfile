# Usamos la imagen oficial de .NET 8 SDK para compilar
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copiamos los archivos del proyecto
COPY . ./

# Restauramos dependencias y compilamos
RUN dotnet restore FutArg11/FutArg11.csproj
RUN dotnet publish FutArg11/FutArg11.csproj -c Release -o /app/publish

# Usamos la imagen de runtime para ejecutar la app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# Exponemos el puerto que Render asignará
EXPOSE 10000

# Comando para levantar la app usando el puerto dinámico
CMD ["dotnet", "FutArg11.dll", "--urls", "http://0.0.0.0:10000"]