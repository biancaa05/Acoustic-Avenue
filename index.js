const express= require("express");
const path= require("path");

app= express();
app.set("view engine", "ejs")

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

app.get("/", function(req, res){
    res.render("pagini/index");
});

app.get("/despre", function(req, res){
    res.render("pagini/despre");
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/cale", function(req, res){
    console.log("Am primit o cerere GET de la adresa /cale");
    res.send("Raspuns la <b style= 'color: red'>cererea</b> GET la adresa /cale")
});

app.get("/cale2", function(req, res){
    console.log("Am primit o cerere GET de la adresa /cale");
    res.write("ceva\n");
    res.write("altceva");
    res.end();
});

app.listen(8080);
console.log("Serverul a pornit!");