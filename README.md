# 🎸 Acoustic Avenue — Magazin Online de Instrumente și Echipamente Muzicale

**Acoustic Avenue** este o platformă web completă de e-commerce dedicată pasionaților de muzică, oferind un catalog dinamic de instrumente, echipamente audio și accesorii. Proiectul este realizat pe o structură modernă și modulară, combinând tehnologii robuste de backend și persistență relațională a datelor cu interfețe utilizator fluide, sigure și complet responsive.

---

## 🛠️ Tehnologii Utilizate

Aplicația integrează un ecosistem diversificat de tehnologii web pentru a asigura performanță, consistență și securitate:

* **HTML5 & EJS (Embedded JavaScript templates):** Utilizate pentru structurarea paginilor și generarea dinamică a conținutului direct pe server (*Server-Side Rendering*).
* **CSS3, SASS & Bootstrap:** Asigură un design modern, fluid și adaptabil pe orice dispozitiv (desktop, tabletă, mobil), folosind animații avansate, variabile și stiluri compilate eficient.
* **JavaScript (Client-Side):** Responsabil de interactivitatea paginilor, manipularea dinamică a DOM-ului, gestiunea persistenței temporare în browser și efectele vizuale în timp real.
* **Node.js & Express (Backend):** Nucleul aplicației, utilizat pentru crearea serverului HTTP, gestionarea sesiunilor de utilizator, rutare securizată și procesarea formularelor.
* **PostgreSQL (Database):** Sistemul de gestiune a bazelor de date relaționale (RDBMS) utilizat pentru stocarea sigură și structurată a datelor esențiale ale magazinului (utilizatori, produse, stocuri).

---

## 🚀 Rolul și Funcționalitățile Aplicației

Ca magazin online, **Acoustic Avenue** acoperă fluxul complet al unei experiențe de cumpărături digitale:

1.  **Gestiunea Produselor:** Catalog complet alimentat din baza de date, cu filtre dinamice, pagini individuale de detalii și sisteme de marcare automată (badge-uri inteligente pentru produsele nou adăugate).
2.  **Persistența Datelor (PostgreSQL):** Stocarea centralizată a informațiilor. Permite interogări快速 și sigure, garantând integritatea datelor prin relații de tip *Foreign Key* și constrângeri structurale.
3.  **Modul de Comparare:** Widget persistent care permite utilizatorilor să selecteze și să compare produse în timp real. Modulul memorează opțiunile utilizatorului între sesiuni (via `localStorage`) și include un sistem de auto-curățare și ascundere automată după 24 de ore de inactivitate.
4.  **Autentificare și Securitate:** Înregistrare și autentificare securizată a utilizatorilor (corelată cu tabela de clienți din PostgreSQL), gestionarea sesiunilor și protecție avansată la nivel de server (blocarea accesului direct la codul sursă `.ejs` și interzicerea listării directoarelor de resurse).
5.  **Feedback Vizual Modern:** Link-uri interactive cu animații radiale care cresc din centru la hover și diferențiere grafică automată pentru legăturile externe.

---

## 🛠️ Ghid de Instalare și Rulare Locală


# 1. Navigarea în directorul proiectului
```bash
cd Proiect_HTML
```

# 2. Instalarea pachetelor și dependențelor NPM înregistrate în package.json
```bash
npm install
```
# 3. Configurarea bazei de date (PostgreSQL)
# - Asigurați-vă că serverul PostgreSQL este activ local sau la distanță.
# - Creați o bază de date dedicată (ex: acoustic_avenue).
# - Executați scriptul de inițializare .sql pentru generarea tabelelor (utilizatori, produse).
# - Actualizați credențialele (host, user, password, port, database) în fișierul de configurare din backend.

# 4. Pornirea serverului de dezvoltare (cu monitorizare automată în timp real)
```bash
nodemon index.js
```
# Notă: Dacă pachetul nodemon nu este disponibil global, porniți aplicația simplu prin Node:
```bash
node index.js
```

## 🎓 Autor și Informații Academice
Proiect realizat de: Turcu Bianca-Florentina

Grupa / Anul: 262 / Anul 2

Facultatea: Facultatea de Matematică și Informatică

Disciplina: Tehnici Web

Profesor Coordonator: Ciocan Irina

# 5. Accesarea aplicației în browser
# Odată ce terminalul confirmă pornirea serverului, navigați la adresa:
# http://localhost:8080
