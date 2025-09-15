using FutArg11.Hubs;
using FutArg11.Services;
using FutArg11.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

var csvPath = Path.Combine(builder.Environment.WebRootPath, "data", "jugadores.csv");
builder.Services.AddSingleton<IJugadorService, JugadorService>();
builder.Services.AddSingleton<IWordleService, WordleService>();
builder.Services.AddSignalR();

var app = builder.Build();


// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");


app.MapHub<ImpostorHub>("/impostorHub");
app.Run();
