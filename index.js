const express = require("express");
const path = require("path");
const fs = require('fs');
const sharp = require('sharp');
const sass = require('sass');
const { Client } = require('pg');
const dateGalerie = require('./galerie.json');

const AccesBD = require("./module_proprii/accesbd.js");
const {Utilizator} = require("./module_proprii/utilizator.js");
const Drepturi = require("./module_proprii/drepturi.js");

const formidable = require("formidable");
const session = require("express-session");

const app = express();
app.set("view engine", "ejs");

console.log("__dirname:", __dirname);
console.log("__filename:", __filename);
console.log("process.cwd():", process.cwd());

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'acoustic_avenue',
    password: 'postgrespa55',
    port: 5432,
});

client.connect()
    .then(() => console.log("Conectat la Postgres pentru Proiect!"))
    .catch(err => console.error("Eroare conexiune Postgres:", err));

app.use(session({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: false
}));


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

async function getCategorii() {
    try {
        const query = `
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'categorie_mare';
        `;
        const rez = await client.query(query);
        return rez.rows.map(row => row.enumlabel);
    } catch (err) {
        console.error("Eroare la preluarea categoriilor:", err);
        return [];
    }
}

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

function verificaErori() {
    const caleJson = path.join(__dirname, 'erori.json');

    if (!fs.existsSync(caleJson)) {
        console.error("[EROARE CRITICĂ] Fișierul 'erori.json' nu există la calea:", caleJson);
        console.error("Aplicația nu poate porni fără acest fișier. Remediați problema și reporniți serverul.");
        process.exit(1);
    }

    let continutBrut;
    let obiectJson;

    try {
        continutBrut = fs.readFileSync(caleJson, 'utf8');
        obiectJson = JSON.parse(continutBrut);
    } catch (err) {
        console.error("[EROARE CRITICĂ] Fișierul 'erori.json' nu poate fi citit sau parsat:", err.message);
        process.exit(1);
    }

    const propNecesare = ['info_erori', 'cale_baza', 'eroare_default'];
    propNecesare.forEach(prop => {
        if (!(prop in obiectJson)) {
            console.error(`[EROARE JSON] Proprietatea "${prop}" lipsește din erori.json. Adăugați-o pentru funcționarea corectă a sistemului de erori.`);
        }
    });

    if (obiectJson.eroare_default) {
        const propDefault = ['titlu', 'text', 'imagine'];
        propDefault.forEach(prop => {
            if (!(prop in obiectJson.eroare_default)) {
                console.error(`[EROARE JSON] Proprietatea "${prop}" lipsește din obiectul "eroare_default". Aceasta este eroarea afișată când nu se găsește o eroare specifică.`);
            }
        });
    }

    if (obiectJson.cale_baza) {
        const caleFolder = path.join(__dirname, obiectJson.cale_baza);
        if (!fs.existsSync(caleFolder)) {
            console.error(`[EROARE FIȘIERE] Folderul specificat în "cale_baza" nu există: "${caleFolder}". Creați folderul sau corectați calea din erori.json.`);
        }
    }

    if (obiectJson.info_erori && obiectJson.cale_baza) {
        obiectJson.info_erori.forEach(e => {
            const caleImagine = path.join(__dirname, obiectJson.cale_baza, e.imagine);
            if (!fs.existsSync(caleImagine)) {
                console.error(`[EROARE FIȘIERE] Imaginea pentru eroarea cu identificatorul "${e.identificator}" nu există la calea: "${caleImagine}". Adăugați imaginea sau corectați calea.`);
            }
        });

        if (obiectJson.eroare_default?.imagine) {
            const caleImgDefault = path.join(__dirname, obiectJson.cale_baza, obiectJson.eroare_default.imagine);
            if (!fs.existsSync(caleImgDefault)) {
                console.error(`[EROARE FIȘIERE] Imaginea pentru "eroare_default" nu există la calea: "${caleImgDefault}". Adăugați imaginea sau corectați calea.`);
            }
        }
    }

    function verificaDuplicateInObiect(continutString, numeObiect) {
        const cheiFolosite = [];
        const regexCheie = /"([^"]+)"\s*:/g;
        let match;
        while ((match = regexCheie.exec(continutString)) !== null) {
            const cheie = match[1];
            if (cheiFolosite.includes(cheie)) {
                console.error(`[EROARE DUPLICAT] Proprietatea "${cheie}" apare de mai multe ori în blocul "${numeObiect}" din erori.json. Ștergeți duplicatul pentru a evita comportament impredictibil.`);
            } else {
                cheiFolosite.push(cheie);
            }
        }
    }

    const matchDefault = continutBrut.match(/"eroare_default"\s*:\s*(\{[^}]+\})/);
    if (matchDefault) {
        verificaDuplicateInObiect(matchDefault[1], "eroare_default");
    }

    const matchInfoErori = continutBrut.match(/"info_erori"\s*:\s*\[([\s\S]*?)\]/);
    if (matchInfoErori) {
        const continutVector = matchInfoErori[1];
        const regexObiect = /\{([^{}]+)\}/g;
        let matchOb;
        let indexObiect = 0;
        while ((matchOb = regexObiect.exec(continutVector)) !== null) {
            verificaDuplicateInObiect(matchOb[1], `info_erori[${indexObiect}]`);
            indexObiect++;
        }
    }

    if (obiectJson.info_erori) {
        const identificatoriVazuti = {};
        obiectJson.info_erori.forEach(e => {
            const id = e.identificator;
            if (identificatoriVazuti[id]) {
                const { identificator, ...restPropietati } = e;
                const { identificator: id2, ...restPropietati2 } = identificatoriVazuti[id];
                console.error(
                    `[EROARE DUPLICAT ID] Identificatorul "${id}" apare de mai multe ori în "info_erori".\n` +
                    `  Prima apariție: ${JSON.stringify(restPropietati2)}\n` +
                    `  A doua apariție: ${JSON.stringify(restPropietati)}\n` +
                    `  Remediați prin eliminarea sau redenumirea unuia dintre ele.`
                );
            } else {
                identificatoriVazuti[id] = e;
            }
        });
    }

    console.log("[OK] Verificarea erori.json finalizată.");
}

verificaErori();
initErori();

const T = 2 * 60 * 1000;
const T2 = 5 * 60 * 1000;
const caleOferte = path.join(__dirname, "oferte.json");

async function genereazaOferta() {
    if (!fs.existsSync(caleOferte)) {
        fs.writeFileSync(caleOferte, JSON.stringify({ "oferte": [] }));
    }

    let dateJson = JSON.parse(fs.readFileSync(caleOferte, 'utf8'));
    
    const categoriiPosibile = ["percutie", "suflat", "corzi", "clape", "audio_video"]; 
    const reduceriPosibile = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

    let ultimaCategorie = dateJson.oferte.length > 0 ? dateJson.oferte[0].categorie : null;
    let categorieNoua;
    do {
        categorieNoua = categoriiPosibile[Math.floor(Math.random() * categoriiPosibile.length)];
    } while (categorieNoua === ultimaCategorie);

    const reducereNoua = reduceriPosibile[Math.floor(Math.random() * reduceriPosibile.length)];
    const dataAcum = new Date();
    const dataFinal = new Date(dataAcum.getTime() + T);

    const ofertaNoua = {
        "categorie": categorieNoua,
        "data-incepere": dataAcum.toISOString(),
        "data-finalizare": dataFinal.toISOString(),
        "reducere": reducereNoua
    };

    dateJson.oferte.unshift(ofertaNoua);

    dateJson.oferte = dateJson.oferte.filter(o => {
        let expiraLa = new Date(o["data-finalizare"]);
        return (dataAcum - expiraLa) < T2;
    });

    fs.writeFileSync(caleOferte, JSON.stringify(dateJson, null, 4));
    
    app.locals.ofertaCurenta = ofertaNoua;
    console.log(`[OFERTĂ] Nouă ofertă generată: ${reducereNoua}% la ${categorieNoua}`);
}

setInterval(genereazaOferta, T);
genereazaOferta();

const caleBackup = path.join(__dirname, "backup");
const T_BACKUP = 60 * 60 * 1000;

setInterval(() => {
    if (fs.existsSync(caleBackup)) {
        fs.readdir(caleBackup, (err, fisiere) => {
            if (err) return;
            const acum = new Date().getTime();
            fisiere.forEach(fisier => {
                const caleF = path.join(caleBackup, fisier);
                const stats = fs.statSync(caleF);
                if (acum - stats.mtimeMs > T_BACKUP) {
                    if (stats.isFile()) {
                        fs.unlinkSync(caleF);
                        console.log(`[BACKUP] Șters fișier vechi: ${fisier}`);
                    } else if (stats.isDirectory()) {
                        fs.rmSync(caleF, { recursive: true, force: true });
                        console.log(`[BACKUP] Șters director vechi cu tot conținutul: ${fisier}`);
                    }
                }
            });
        });
    }
}, 10 * 60 * 1000);

app.use((req, res, next) => {
    res.locals.ip = req.ip;
    res.locals.vazutDeToti=[1,2,3];

    res.locals.Drepturi=Drepturi;
    if (req.session.utilizator){
        req.utilizator=res.locals.utilizator=new Utilizator(req.session.utilizator);
        res.locals.mesajLogin=req.session.mesajLogin
    }  
    next();
});

app.use("/resurse", (req, res, next) => {
    if (req.url.endsWith("/")) return afisareEroare(res, 403);
    next();
});
app.use("/resurse", express.static(path.join(__dirname, "resurse"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
        if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    }
}));

app.locals.formateazaData = function(data) {
    if (!data) return "Dată necunoscută";
    const d = new Date(data);
    const zile = ["Duminica", "Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata"];
    const luni = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
    
    return `${d.getDate()}(${zile[d.getDay()]})/${luni[d.getMonth()]}/${d.getFullYear()}`;
};

app.use(async (req, res, next) => {
    res.locals.categoriiMeniu = await getCategorii();

    res.locals.formateazaData = (data) => {
        if (!data) return "Dată necunoscută";
        const zile = ["Duminica", "Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata"];
        const luni = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
        const d = new Date(data);
        return `${d.getDate()}(${zile[d.getDay()]})/${luni[d.getMonth()]}/${d.getFullYear()}`;
    };
    next();
});

client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'categorie_mare'", (err, res) => {
    if (!err) {
        app.locals.categoriiMeniu = res.rows.map(row => row.enumlabel);
        console.log("Categorii meniu încărcate:", app.locals.categoriiMeniu);
    } else {
        console.error("Eroare la extragerea categoriilor:", err);
    }
});

app.get('/produse', (req, res) => {
    let categorieSelectata = req.query.tip;
    let querySQL = "SELECT * FROM produse";
    let params = [];

    if (categorieSelectata) {
        querySQL += " WHERE categorie = $1";
        params.push(categorieSelectata);
    }

    client.query(querySQL, params, (err, rezultat) => {
        if (err) {
            return res.status(500).send("Eroare baza de date");
        }
        res.render('pagini/produse', { 
            produse: rezultat.rows,
            categorieActiva: categorieSelectata || 'toate'
        });
    });
});

app.get('/produs/:id', (req, res) => {
    const idProdus = parseInt(req.params.id);
    if (isNaN(idProdus)) return res.status(400).send("ID invalid");

    client.query('SELECT * FROM produse WHERE id = $1', [idProdus], (err, rezultat) => {
        if (err || rezultat.rows.length === 0) {
            return res.status(404).render('pagini/404', { mesaj: "Produsul nu a fost găsit." });
        }
        const produsPrincipal = rezultat.rows[0];

        const folderImagini = path.join(__dirname, 'resurse', 'imagini', 'produse', `prod${idProdus}`);
        console.log("Cale folder:", folderImagini);
        console.log("Există:", fs.existsSync(folderImagini));
        if (fs.existsSync(folderImagini)) {
            console.log("Fișiere găsite:", fs.readdirSync(folderImagini));
        }
        produsPrincipal.nr_imagini = fs.existsSync(folderImagini)
            ? fs.readdirSync(folderImagini).filter(f => f.match(/^\d+\.webp$/)).length
            : 1;
        console.log("nr_imagini:", produsPrincipal.nr_imagini);

        client.query('SELECT * FROM produse WHERE categorie = $1 AND id != $2 LIMIT 4', [produsPrincipal.categorie, idProdus], (errSim, rezultatSimilare) => {
            let v_similare = (errSim || !rezultatSimilare) ? [] : rezultatSimilare.rows;

            const querySeturi = `
                SELECT s.id AS set_id, s.nume_set, s.descriere_set,
                       p.id AS prod_id, p.nume AS prod_nume, p.pret AS prod_pret
                FROM seturi s
                JOIN asociere_set asoc ON s.id = asoc.id_set
                JOIN produse p ON asoc.id_produs = p.id
                WHERE s.id IN (SELECT id_set FROM asociere_set WHERE id_produs = $1);
            `;

            client.query(querySeturi, [idProdus], (errSeturi, rezultatSeturi) => {
                let seturiGrupate = {};
                if (!errSeturi && rezultatSeturi) {
                    rezultatSeturi.rows.forEach(row => {
                        if (!seturiGrupate[row.set_id]) {
                            seturiGrupate[row.set_id] = { id: row.set_id, nume: row.nume_set, descriere: row.descriere_set, produse: [] };
                        }
                        seturiGrupate[row.set_id].produse.push({ id: row.prod_id, nume: row.prod_nume, pret: row.prod_pret });
                    });
                }

                res.render('pagini/produs', { 
                    prod: produsPrincipal, 
                    similare: v_similare,
                    seturiDinProdus: Object.values(seturiGrupate)
                });
            });
        });
    });
});

app.use((req, res, next) => {
    if (req.path.endsWith(".ejs")) return afisareEroare(res, 400);
    next();
});

const rutePrincipale = ["/", "/index", "/home"];
app.get(rutePrincipale, async (req, res) => {
    const imagini = await obtineDateGalerie();
    
    if (!fs.existsSync(caleOferte)) {
        console.log("Fișierul nu există în resurse, îl creez acum...");
        fs.writeFileSync(caleOferte, JSON.stringify({ "oferte": [] }, null, 4));
    }
    
    let dateOferte = JSON.parse(fs.readFileSync(caleOferte, 'utf8'));
    let ofertaActiva = dateOferte.oferte.length > 0 ? dateOferte.oferte[0] : null;

    const queryNoi = `
        SELECT id, nume, pret, data_adaugare 
        FROM produse 
        WHERE data_adaugare >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY data_adaugare DESC 
        LIMIT 4;
    `;

    client.query(queryNoi, (err, rezultat) => {
        let produseRecente = (err || !rezultat) ? [] : rezultat.rows;

        res.render("pagini/index", {
            ip: req.ip, 
            imagini,
            cale: dateGalerie.cale_galerie,
            oferta: ofertaActiva,
            produseNoiAcasa: produseRecente
        });
    });
});

app.get('/filtrare-ajax', function(req, res) {
    let { nume, categorie, expertiza, pret, sort1, sort2, ordine } = req.query;
    let semn = parseInt(ordine);

    let rezultate = [...produse_db];

    if (nume) {
        rezultate = rezultate.filter(p => p.nume.toLowerCase().includes(nume.toLowerCase()));
    }
    if (categorie) {
        rezultate = rezultate.filter(p => p.categorie === categorie);
    }
    if (pret) {
        rezultate = rezultate.filter(p => p.pret <= parseFloat(pret));
    }
    if (expertiza && expertiza !== "oricare") {
        rezultate = rezultate.filter(p => p.nivel_expertiza === expertiza);
    }

    rezultate.sort((a, b) => {
        if (a[sort1] !== b[sort1]) {
            return (a[sort1] < b[sort1] ? -semn : semn);
        }
        return (a[sort2] < b[sort2] ? -semn : semn);
    });

    res.render("fragmente/produse_filtrare", { produse: rezultate });
});

app.get("/galerie", async (req, res) => {
    const imagini = await obtineDateGalerie();
    res.render("pagini/galerie", { ip: req.ip, imagini, cale: dateGalerie.cale_galerie });
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
});

app.get('/seturi', (req, res) => {
    const query = `
        SELECT s.id AS set_id, s.nume_set, s.descriere_set, 
               p.id AS produs_id, p.nume AS produs_nume, p.pret AS produs_pret, p.categorie
        FROM seturi s
        JOIN asociere_set asoc ON s.id = asoc.id_set
        JOIN produse p ON asoc.id_produs = p.id
        ORDER BY s.id;
    `;

    client.query(query, (err, rezultat) => {
        if (err) return res.status(500).send("Eroare DB Seturi");

        let seturiGrupate = {};
        rezultat.rows.forEach(row => {
            if (!seturiGrupate[row.set_id]) {
                seturiGrupate[row.set_id] = {
                    id: row.set_id,
                    nume: row.nume_set,
                    descriere: row.descriere_set,
                    produse: []
                };
            }
            seturiGrupate[row.set_id].produse.push({
                id: row.produs_id,
                nume: row.produs_nume,
                pret: row.produs_pret,
                categorie: row.categorie
            });
        });

        res.render('pagini/seturi', { seturi: Object.values(seturiGrupate) });
    });
});

app.get('/compara', (req, res) => {
    const { id1, id2 } = req.query;
    if (!id1 || !id2) return res.status(400).send("Lipsesc ID-urile.");

    client.query(`SELECT * FROM produse WHERE id IN ($1, $2);`, [id1, id2], (err, rezultat) => {
        if (err || !rezultat || rezultat.rows.length < 2) return res.status(404).send("Produsele nu au fost găsite.");
        
        let p1 = rezultat.rows.find(p => p.id == id1);
        let p2 = rezultat.rows.find(p => p.id == id2);
        res.render('pagini/fereastra_compara', { p1, p2 });
    });
});

app.post("/inregistrare",function(req, res){
    var username, poza;
    var formular= new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier ){//4
        console.log("Inregistrare:",campuriText);
        console.log("Campuri fisier:",campuriFisier);
        console.log(poza, username);
        var eroare="";
        var utilizNou =new Utilizator();
        try{
            utilizNou.setareNume=campuriText.nume[0];
            utilizNou.setareUsername=campuriText.username[0];
            utilizNou.email=campuriText.email[0]
            utilizNou.prenume=campuriText.prenume[0]
            utilizNou.parola=campuriText.parola[0];
            utilizNou.culoare_chat=campuriText.culoare_chat[0];
            utilizNou.poza= poza;
            Utilizator.getUtilizDupaUsername(campuriText.username[0], {}, function(u, parametru ,eroareUser ){
                if (eroareUser==-1){
                    utilizNou.salvareUtilizator()
                }
                else{
                    eroare+="Mai exista username-ul";
                }
                if(!eroare){
                    res.render("pagini/inregistrare", {raspuns:"Inregistrare cu succes!"})
                }
                else
                    res.render("pagini/inregistrare", {err: "Eroare: "+eroare});
            })
        }
        catch(e){
            console.log(e);
            eroare+= "Eroare site; reveniti mai tarziu";
            res.render("pagini/inregistrare", {err: "Eroare: "+eroare})
        }

    });
    formular.on("field", function(nume,val){  // 1
        console.log(`--- ${nume}=${val}`);
        if(nume=="username")
            username=val;
    })
    formular.on("fileBegin", function(nume,fisier){ //2
        var folderUser=path.join(__dirname, "poze_uploadate", username);
        if (!fs.existsSync(folderUser))
            fs.mkdirSync(folderUser)
        fisier.filepath=path.join(folderUser, fisier.originalFilename)
        poza=fisier.originalFilename;
        console.log("fileBegin:",poza)
        console.log("fileBegin, fisier:",nume, fisier)
    })    
    formular.on("file", function(nume,fisier){//3
        console.log("file");
        console.log(nume,fisier);
    });
});


app.post("/login",function(req, res){
    var username;
    console.log("ceva");
    var formular= new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier ){
        var parametriCallback= {
            req:req,
            res:res,
            parola: campuriText.parola[0]
        }
        Utilizator.getUtilizDupaUsername (campuriText.username[0],parametriCallback, 
            function(u, obparam, eroare ){ //proceseazaUtiliz
            let parolaCriptata=Utilizator.criptareParola(obparam.parola)
            if(u.parola== parolaCriptata && u.confirmat_mail){
                u.poza=u.poza?path.join("poze_uploadate",u.username, u.poza):"";
                obparam.req.session.utilizator=u;               
                obparam.req.session.mesajLogin="Bravo! Te-ai logat!";
                obparam.res.redirect("/index");
                
            }
            else{
                console.log("Eroare logare")
                obparam.req.session.mesajLogin="Date logare incorecte sau nu a fost confirmat mailul!";
                obparam.res.redirect("/index");
            }
        })
    });
    
});

app.get("/logout", function(req, res){
    req.session.destroy();
    res.locals.utilizator=null;
    res.render("pagini/logout");
});


//http://${Utilizator.numeDomeniu}/cod/${utiliz.username}/${token}
app.get("/cod/:username/:token",function(req,res){
    try {
        var parametriCallback={
            req:req,
            token:req.params.token
        }
        Utilizator.getUtilizDupaUsername(req.params.username,parametriCallback ,function(u,obparam){
            let parametriCerere={
                tabel:"utilizatori",
                campuri:{confirmat_mail:true},
                conditiiAnd:[`id=${u.id}`]
            };
            AccesBD.getInstanta().update(
                parametriCerere, 
                function (err, rezUpdate){
                    if(err || rezUpdate.rowCount==0){
                        console.log("Cod:", err);
                        afisareEroare(res,3);
                    }
                    else{
                        res.render("pagini/confirmare.ejs");
                    }
                })
        })
    }
    catch (e){
        console.log(e);
        afisareEroare(res,2);
    }
})


app.post("/profil", function(req, res){
    console.log("profil");
    if (!req.session.utilizator){
        afisareEroare(res,403)
        return;
    }
    var formular= new formidable.IncomingForm();
 
    formular.parse(req,function(err, campuriText, campuriFile){
       
        var parolaCriptata=Utilizator.criptareParola(campuriText.parola[0]);
 
        AccesBD.getInstanta().updateParametrizat(
            {tabel:"utilizatori",
            campuri:["nume","prenume","email","culoare_chat"],
            valori:[
                `${campuriText.nume[0]}`,
                `${campuriText.prenume[0]}`,
                `${campuriText.email[0]}`,
                `${campuriText.culoare_chat[0]}`],
            conditiiAnd:[
                `parola='${parolaCriptata}'`,
                `username='${campuriText.username[0]}'`
            ]
        },          
        function(err, rez){
            if(err){
                console.log(err);
                afisareEroare(res,2);
                return;
            }
            console.log(rez.rowCount);
            if (rez.rowCount==0){
                res.render("pagini/profil",{mesaj:"Update-ul nu s-a realizat. Verificati parola introdusa."});
                return;
            }
            else{            
                //actualizare sesiune
                console.log("ceva");
                req.session.utilizator.nume= campuriText.nume[0];
                req.session.utilizator.prenume= campuriText.prenume[0];
                req.session.utilizator.email= campuriText.email[0];
                req.session.utilizator.culoare_chat= campuriText.culoare_chat[0];
                res.locals.utilizator=req.session.utilizator;
            }
 
 
            res.render("pagini/profil",{mesaj:"Update-ul s-a realizat cu succes."});
 
        });
       
 
    });
});

app.get("/useri", function(req, res){

    if(req?.utilizator?.areDreptul(Drepturi.vizualizareUtilizatori)){
        var obiectComanda={
            tabel:"utilizatori",
            campuri:["*"],
            conditiiAnd:[]
        };
        AccesBD.getInstanta().select(obiectComanda, function(err, rezQuery){
            console.log(err);
            res.render("pagini/useri", {useri: rezQuery.rows});
        });
        
    }
    else{
        afisareEroare(res, 403);
    }
    
});


app.post("/sterge_utiliz",  function(req, res){
    if(req?.utilizator?.areDreptul(Drepturi.stergereUtilizatori)){
        var formular= new formidable.IncomingForm();
 
        formular.parse(req,function(err, campuriText, campuriFile){
                var obiectComanda= {
                    tabel:"utilizatori",
                    conditiiAnd:[`id=${campuriText.id_utiliz[0]}`]
                }
                AccesBD.getInstanta().delete(obiectComanda, function(err, rezQuery){
                console.log(err);
                res.redirect("/useri");
            });
        });
    }else{
        afisareEroare(res,403);
    }
    
})

app.get('/resurse/imagini/produse/:folder/:fisier', (req, res) => {
    const cale = path.join(__dirname, 'resurse', 'imagini', 'produse', req.params.folder, req.params.fisier);
    console.log("Cerere imagine:", cale);
    console.log("Există:", fs.existsSync(cale));
    if (fs.existsSync(cale)) {
        res.sendFile(cale);
    } else {
        res.status(404).send("Imagine negăsită");
    }
});

app.get("/*", (req, res) => {
    let numePagina = req.params[0];

    const extensiiStatice = ['.css', '.js', '.json', '.webp', '.jpg', '.png', '.ico', '.svg', '.woff', '.ttf'];
    if (extensiiStatice.some(ext => numePagina.endsWith(ext))) {
        return afisareEroare(res, 404);
    }

    res.render("pagini/" + numePagina, { ip: req.ip }, (err, html) => {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Eroare Randare", err.message);
            }
        } else {
            res.send(html);
        }
    });
});

const PORT = 8080;
app.listen(PORT, () => console.log(`Server activ la http://localhost:${PORT}`));