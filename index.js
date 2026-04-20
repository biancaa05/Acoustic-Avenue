const express = require("express");
const path = require("path");
const fs = require('fs');
const sharp = require('sharp');
const sass = require('sass');
const dateGalerie = require('./galerie.json');

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
vect_foldere.forEach((numeFolder) => {
    const caleCompleta = path.join(__dirname, numeFolder);
    if (!fs.existsSync(caleCompleta)) {
        fs.mkdirSync(caleCompleta);
        console.log(`Folderul "${numeFolder}" a fost creat.`);
    }
});

let obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup")
};

function compileazaScss(caleScss, caleCss) {
    let drumScss = path.isAbsolute(caleScss) ? caleScss : path.join(obGlobal.folderScss, caleScss);
    
    let numeFisierCss = caleCss || path.basename(drumScss).replace(".scss", ".css");
    let drumCss = path.isAbsolute(numeFisierCss) ? numeFisierCss : path.join(obGlobal.folderCss, numeFisierCss);

    if (fs.existsSync(drumCss)) {
        let drumBackupDir = path.join(obGlobal.folderBackup, "resurse/css");
        if (!fs.existsSync(drumBackupDir)) {
            fs.mkdirSync(drumBackupDir, { recursive: true });
        }
        
        let numeBackup = `${path.basename(drumCss, ".css")}_${Date.now()}.css`;
        let drumBackupFisier = path.join(drumBackupDir, numeBackup);

        try {
            fs.copyFileSync(drumCss, drumBackupFisier);
        } catch (err) {
            console.error(`[Eroare Backup] Nu s-a putut copia ${drumCss}:`, err);
        }
    }

    try {
        const rezultat = sass.compile(drumScss);
        fs.writeFileSync(drumCss, rezultat.css);
        console.log(`[SCSS] Compilat cu succes: ${path.basename(drumScss)}`);
    } catch (err) {
        console.error(`[Eroare SCSS] Compilare eșuată pentru ${drumScss}:`, err);
    }
}

function initializareScss() {
    if (fs.existsSync(obGlobal.folderScss)) {
        const fisiere = fs.readdirSync(obGlobal.folderScss);
        fisiere.forEach(f => {
            if (f.endsWith(".scss")) compileazaScss(f);
        });

        fs.watch(obGlobal.folderScss, (eventType, filename) => {
            if (filename && filename.endsWith(".scss")) {
                console.log(`[Watch] Modificare detectată în: ${filename}`);
                compileazaScss(filename);
            }
        });
    }
}

initializareScss();

function initErori() {
    try {
        const caleJson = path.join(__dirname, 'erori.json');
        let obiectJson = JSON.parse(fs.readFileSync(caleJson, 'utf8'));
        obiectJson.info_erori.forEach(e => { e.imagine = obiectJson.cale_baza + e.imagine; });
        obiectJson.eroare_default.imagine = obiectJson.cale_baza + obiectJson.eroare_default.imagine;
        obGlobal.obErori = obiectJson;
    } catch (err) { console.error("Eroare la citirea erori.json:", err); }
}
initErori();

async function obtineDateGalerie() {
    const oraCurenta = new Date().getHours();
    let filtrate = dateGalerie.imagini.filter(img => 
        img.intervale_ore.some(int => oraCurenta >= int[0] && oraCurenta <= int[1])
    );

    filtrate = filtrate.slice(0, Math.floor(filtrate.length / 2) * 2);
    
    const caleAbsoluta = path.join(__dirname, "resurse", "imagini", "galerie");
    await Promise.all(filtrate.map(async img => {
        const nume = img.cale_relativa.split('.')[0];
        const ext = img.cale_relativa.split('.')[1];
        const drumOrig = path.join(caleAbsoluta, img.cale_relativa);
        const drumMed = path.join(caleAbsoluta, `${nume}-med.${ext}`);
        
        if (fs.existsSync(drumOrig) && !fs.existsSync(drumMed)) {
            await sharp(drumOrig).resize(400).toFile(drumMed);
        }
    }));
    return filtrate;
}

const app = express();
app.set("view engine", "ejs");

// --- 6. Middleware & Rute ---
app.use("/resurse", (req, res, next) => {
    if (req.url.endsWith("/")) return afisareEroare(res, 403);
    next();
});
app.use("/resurse", express.static(path.join(__dirname, "resurse")));

const rutePrincipale = ["/", "/index", "/home"];
app.get(rutePrincipale, async (req, res) => {
    const imagini = await obtineDateGalerie();
    res.render("pagini/index", { ip: req.ip, imagini, cale: dateGalerie.cale_galerie });
});

app.get("/galerie", async (req, res) => {
    const imagini = await obtineDateGalerie();
    res.render("pagini/galerie", { ip: req.ip, imagini, cale: dateGalerie.cale_galerie });
});

app.get("/:pagina", (req, res) => {
    res.render("pagini/" + req.params.pagina, { ip: req.ip }, (err, html) => {
        if (err) {
            if (err.message.includes("Failed to lookup view")) afisareEroare(res, 404);
            else afisareEroare(res, 500, "Eroare Randare", err.message);
        } else res.send(html);
    });
});

function afisareEroare(res, id, titlu, text, img) {
    if (!obGlobal.obErori) return res.status(500).send("Eroare critică.");
    let e = obGlobal.obErori.info_erori.find(err => err.identificator === id) || obGlobal.obErori.eroare_default;
    res.status(id || 500).render("pagini/eroare", {
        titlu: titlu || e.titlu,
        text: text || e.text,
        imagine: img || e.imagine,
        ip: res.req.ip 
    });
}

const PORT = 8080;
app.listen(PORT, () => console.log(`Server activ la http://localhost:${PORT}`));