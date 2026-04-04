const express = require("express");
const path = require("path");
const fs = require('fs');


const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];

vect_foldere.forEach((numeFolder) => {
    const caleCompleta = path.join(__dirname, numeFolder);

    if (!fs.existsSync(caleCompleta)) {
        fs.mkdirSync(caleCompleta);
        console.log(`Folderul "${numeFolder}" a fost creat cu succes la locația: ${caleCompleta}`);
    } else {
        console.log(`Folderul "${numeFolder}" există deja.`);
    }
});

let obGlobal = {
    obErori: null
};

function initErori() {
    try {
        const caleJson = path.join(__dirname, 'erori.json');
        let continutJson = fs.readFileSync(caleJson, 'utf8');
        let obiectJson = JSON.parse(continutJson);

        obiectJson.info_erori.forEach(eroare => {
            eroare.imagine = obiectJson.cale_baza + eroare.imagine;
        });
        obiectJson.eroare_default.imagine = obiectJson.cale_baza + obiectJson.eroare_default.imagine;

        obGlobal.obErori = obiectJson;
    } catch (err) {
        console.error("Eroare la citirea fisierului erori.json:", err);
    }
}

initErori();

const app = express();
app.set("view engine", "ejs");

app.use("/resurse", function(req, res, next) {
    if (req.url.endsWith("/")) {
        return afisareEroare(res, 403);
    }
    next();
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.use(function(req, res, next) {
    if (req.url.endsWith(".ejs")) {
        return afisareEroare(res, 400);
    }
    next();
});

const rutePrincipale = ["/", "/index", "/home"];

app.get(rutePrincipale, function(req, res) {
    res.render("pagini/index", { ip: req.ip });
});

app.get("/contact", function(req, res){
    res.render("pagini/contact", { ip: req.ip });
});

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon.ico"), function(err) {
        if (err) {
            console.warn("Faviconul nu a fost gasit la calea specificata.");
            res.status(404).end();
        }
    });
});

function afisareEroare(res, identificator, titluParam, textParam, imagineParam) {
    if (!obGlobal.obErori) {
        return res.status(500).send("Eroare critica: Datele de eroare nu sunt incarcate.");
    }

    let eroareGasita = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
    let eroareaMea = eroareGasita || obGlobal.obErori.eroare_default;

    let titluFinal = titluParam || eroareaMea.titlu;
    let textFinal = textParam || eroareaMea.text;
    let imagineFinal = imagineParam || eroareaMea.imagine;

    res.status(identificator || 500);

    res.render("pagini/eroare", {
        titlu: titluFinal,
        text: textFinal,
        imagine: imagineFinal,
        ip: res.req.ip 
    });
}

app.get("/:pagina", function(req, res) {
    let numePagina = req.params.pagina;

    res.render("pagini/" + numePagina, { ip: req.ip }, function(eroare, rezultatRandare) {
        if (eroare) {
            if (eroare.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Eroare Randare", "A aparut o eroare la procesarea paginii: " + eroare.message);
            }
        } else {
            res.send(rezultatRandare);
        }
    });
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Serverul Acoustic Avenue a pornit la http://localhost:${PORT}`);
});