# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY . ./

RUN dotnet restore FutArg11.csproj
RUN dotnet publish FutArg11.csproj -c Release -o /app/publish

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
EXPOSE 10000
CMD ["dotnet", "FutArg11.dll", "--urls", "http://0.0.0.0:$PORT"]