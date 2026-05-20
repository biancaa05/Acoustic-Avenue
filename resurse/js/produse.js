window.addEventListener("DOMContentLoaded", () => {
    
    const toateMeniurile = document.querySelectorAll('details.filtru-dropdown');
    toateMeniurile.forEach(meniu => {
        const summary = meniu.querySelector('summary');
        summary.addEventListener('click', function(e) {
            e.preventDefault();
            const eraDeschis = meniu.hasAttribute('open');
            toateMeniurile.forEach(m => m.removeAttribute('open'));
            if (!eraDeschis) meniu.setAttribute('open', '');
        });
    });

    document.querySelectorAll(".btn-dropdown").forEach(btn => {
        btn.addEventListener("click", e => e.stopPropagation());
    });

    const modal = document.getElementById("modal-produs");
    const containerDetalii = document.getElementById("detalii-modal");
    const btnInchide = document.getElementById("inchide-modal");

    const produse = document.querySelectorAll(".produs");

    produse.forEach(articol => {
        articol.addEventListener("click", function(e) {
            if (e.target.closest('button') || e.target.closest('a')) return;

            const nume = articol.querySelector(".nume-produs").innerText;
            const descriere = articol.querySelector(".descriere-produs").innerText;
            const pret = articol.querySelector(".val-pret").innerText;
            const imagineSrc = articol.querySelector("img").src;
            const expertiza = articol.querySelector(".val-expertiza").innerText;
            const garantie = articol.querySelector(".val-garantie").innerText;

            containerDetalii.innerHTML = `
                <div class="modal-flex" style="display: flex; gap: 20px; align-items: start; flex-wrap: wrap; padding: 10px;">
                    <img src="${imagineSrc}" style="width: 45%; max-width: 300px; border-radius: 10px; border: 2px solid var(--culoare-accent, #007bff);">
                    <div style="flex: 1; min-width: 250px;">
                        <h2 style="color: var(--culoare-accent, #007bff); margin-top: 0;">${nume}</h2>
                        <hr style="border: 1px solid var(--culoare-accent, #ccc); opacity: 0.3;">
                        <p><strong>Preț:</strong> <span style="font-size: 1.2em; font-weight: bold; color: var(--culoare-accent);">${pret}</span></p>
                        <p><strong>Nivel Expertiză:</strong> ${expertiza}</p>
                        <p><strong>Garanție:</strong> ${garantie}</p>
                        <p style="margin-top: 15px; font-style: italic; border-left: 3px solid var(--culoare-accent); padding-left: 10px;">${descriere}</p>
                    </div>
                </div>
            `;

            modal.style.display = "block";
            document.body.style.overflow = "hidden";
        });
    });

    btnInchide.onclick = () => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    };

    const container = document.getElementById("container-produse");
    const articoleProduse = Array.from(document.getElementsByClassName("produs"));
    articoleProduse.forEach((prod, index) => {
        if (!prod.hasAttribute("data-id")) {
            prod.setAttribute("data-id", index.toString());
        }
    });
    const ordineOriginala = [...articoleProduse];

    const K = 6;
    let paginaCurenta = 1;

    function afiseazaPagina(P) {
    paginaCurenta = P;
    let toateProdusele = Array.from(document.getElementsByClassName("produs"));
    let produseFiltrate = toateProdusele.filter(p => p.getAttribute("data-filtrat") !== "nu");

    toateProdusele.forEach(prod => prod.style.display = "none");

    let start = (P - 1) * K;
    let end = P * K;

    produseFiltrate.forEach((prod, index) => {
        if (index >= start && index < end) {
            prod.style.display = "block";
        }
    });

    genereazaButoanePaginare(produseFiltrate.length);
}

    function genereazaButoanePaginare(N) {
        const containerPaginare = document.getElementById("container-paginare");
        if (!containerPaginare) return;
        
        containerPaginare.innerHTML = "";
        let NRL = Math.ceil(N / K);
        if (NRL <= 1) return;

        for (let i = 1; i <= NRL; i++) {
            let btn = document.createElement("button");
            btn.textContent = i;
            btn.className = (i === paginaCurenta) ? "btn btn-primary" : "btn btn-outline-primary";
            
            btn.onclick = function() {
                afiseazaPagina(i);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            containerPaginare.appendChild(btn);
        }
    }

    articoleProduse.forEach(prod => {
        const idProd = prod.getAttribute("data-id");

        prod.querySelector(".btn-pin").onclick = function(e) {
            e.stopPropagation();
            prod.classList.toggle("pin-activ");
            this.classList.toggle("activ");
            filtreazaProduse();
        };

        prod.querySelector(".btn-ascunde").onclick = function(e) {
            e.stopPropagation();
            prod.style.display = "none";
        };

        prod.querySelector(".btn-exclude").onclick = function(e) {
            e.stopPropagation();
            let excluse = JSON.parse(sessionStorage.getItem("produse_excluse") || "[]");

            if (!excluse.includes(idProd)) {
                excluse.push(idProd);
                sessionStorage.setItem("produse_excluse", JSON.stringify(excluse));
            }

            filtreazaProduse();
        };
    });

    function getVal(prod, cheie) {
        if (cheie === "pret")
            return parseFloat(prod.querySelector(".val-pret").textContent);
        if (cheie === "nume")
            return normalizeText(prod.querySelector(".nume-produs").textContent);
        if (cheie === "categorie")
            return normalizeText(prod.querySelector(".categorie-text span").textContent);

        return "";
    }

    function filtreazaProduse() {
        if (!validareFiltre()) return;

        const v_nume = normalizeText(document.getElementById("inp-nume").value);
        const descriereVal = document.getElementById("inp-descriere").value;
        const v_cuvinte_cheie = descriereVal.split(',')
            .map(c => normalizeText(c.trim()))
            .filter(c => c.length > 0);
        const v_categorie = document.getElementById("inp-categorie").value;
        const v_expertiza = document.getElementById("inp-expertiza").value;
        const v_pret = parseFloat(document.getElementById("inp-pret").value);
        const selectCuloare = document.getElementById("inp-culoare");
        const v_culori = Array.from(selectCuloare.selectedOptions).map(opt => opt.value.toLowerCase());
        const v_materiale = Array.from(document.querySelectorAll('input[name="material"]:checked')).map(cb => cb.value);
        const v_garantie = document.querySelector('input[name="gr_garantie"]:checked').value;
        const mapMateriale = {
                "lemn": ["lemn"],
                "metal": ["metal", "alama", "cupru", "argint", "otel", "bronz", "staniu"],
                "plastic": ["plastic", "ebonita", "nailon", "sidef"],
                "electronice": ["electronice"]
            };

        let excluse = JSON.parse(sessionStorage.getItem("produse_excluse") || "[]");

        for (let prod of articoleProduse) {
            const idProd = prod.getAttribute("data-id");

            if (excluse.includes(idProd)) {
                prod.style.display = "none";
                prod.setAttribute("data-filtrat", "nu");
                continue;
            }

            if (prod.classList.contains("pin-activ")) {
                prod.setAttribute("data-filtrat", "da");
                continue;
            }

            let numeProdus = normalizeText(prod.querySelector(".nume-produs").textContent);
            let descriereProdus = normalizeText(prod.querySelector(".descriere-produs").textContent);
            let pretProdus = parseFloat(prod.querySelector(".val-pret").textContent);
            let expertizaProdus = normalizeText(prod.querySelector(".val-expertiza").textContent);
            let materialeProdus = normalizeText(prod.querySelector(".val-materiale").textContent);
            let garantieProdus = normalizeText(prod.querySelector(".val-garantie").textContent.trim());
            let catProdus = normalizeText(prod.querySelector(".categorie-text span").textContent);
            let culoareProdus = (prod.getAttribute("data-culoare") || "").toLowerCase();

            let condNume = numeProdus.includes(v_nume);
            let condCategorie = (v_categorie === "") || (catProdus === v_categorie);
            let condExpertiza = (v_expertiza === "oricare") || (expertizaProdus === v_expertiza);
            let condPret = (pretProdus <= v_pret);
            let condDescriere = v_cuvinte_cheie.length === 0 || v_cuvinte_cheie.some(c => descriereProdus.includes(c));
            let condCuloare = v_culori.includes("toate") || v_culori.includes(culoareProdus);
            let condMateriale = v_materiale.some(m => 
                mapMateriale[m].some(mat => materialeProdus.includes(mat))
            );
            let condGarantie = (v_garantie === "toate") ||
                (v_garantie === "da" && garantieProdus === "Da") ||
                (v_garantie === "nu" && garantieProdus === "Nu");

            if (condNume && condCategorie && condExpertiza && condPret &&
                condDescriere && condCuloare && condMateriale && condGarantie) {
                prod.setAttribute("data-filtrat", "da");
            } else {
                prod.setAttribute("data-filtrat", "nu");
                prod.style.display = "none";
            }
        }
        afiseazaPagina(1);
    }

    ["inp-nume", "inp-descriere", "inp-categorie", "inp-expertiza", "inp-culoare"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const evTip = (el.tagName === "INPUT") ? "input" : "change";
            el.addEventListener(evTip, filtreazaProduse);
        }
    });

    document.querySelectorAll('input[name="material"], input[name="gr_garantie"]').forEach(el => {
        el.addEventListener("change", filtreazaProduse);
    });

    function validareFiltre() {
    const nume = document.getElementById("inp-nume").value;
    if (nume && /^\d+$/.test(nume)) {
        alert("Numele nu poate conține doar cifre!");
        return false;
    }
    return true;
}

    function normalizeText(text) {
        return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/ș/g, "s").replace(/ț/g, "t")
            .replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i");
    }

    function getValSortare(prod, cheie) {
    switch(cheie) {
        case "pret":
            let pretText = prod.querySelector(".val-pret").textContent;
            return parseFloat(pretText) || 0;
        case "nume":
            return normalizeText(prod.querySelector(".nume-produs").textContent.trim());
        case "categorie":
            return normalizeText(prod.querySelector(".categorie-text span").textContent.trim());
        case "materiale":
            return prod.querySelector(".val-materiale").textContent
                .trim().split(/[\n,]+/).filter(m => m.trim()).length;
        case "expertiza":
            const ordinExpertiza = { "incepator": 1, "mediu": 2, "avansat": 3 };
            let exp = normalizeText(prod.querySelector(".val-expertiza").textContent.trim());
            return ordinExpertiza[exp] || 0;
        default:
            return "";
    }
}

function sorteazaProduse(semn) {
    if (!validareFiltre()) return;

    const cheie1 = document.getElementById("sort1").value;
    const cheie2 = document.getElementById("sort2").value;

    if (cheie1 === cheie2) {
        alert("Cele două chei de sortare trebuie să fie diferite!");
        return;
    }

    let produseSort = [...articoleProduse].filter(p =>
        p.getAttribute("data-filtrat") !== "nu"
    );

    produseSort.sort((a, b) => {
        let v1a = getValSortare(a, cheie1);
        let v1b = getValSortare(b, cheie1);

        if (v1a !== v1b) {
            return (v1a < v1b ? -1 : 1) * semn;
        }

        let v2a = getValSortare(a, cheie2);
        let v2b = getValSortare(b, cheie2);

        if (v2a !== v2b) {
            return (v2a < v2b ? -1 : 1) * semn;
        }

        return 0;
    });

    let produseExcluse = [...articoleProduse].filter(p =>
        p.getAttribute("data-filtrat") === "nu"
    );

    [...produseSort, ...produseExcluse].forEach(p => container.appendChild(p));
    afiseazaPagina(1);
}

document.getElementById("btn-sort-asc").addEventListener("click", (e) => {
    e.stopPropagation();
    sorteazaProduse(1);
});

document.getElementById("btn-sort-desc").addEventListener("click", (e) => {
    e.stopPropagation();
    sorteazaProduse(-1);
});

    document.getElementById("btn-calcul").addEventListener("click", () => {
        let produseFiltrate = articoleProduse.filter(p => 
            p.getAttribute("data-filtrat") !== "nu"
        );
        let preturi = produseFiltrate.map(p => 
            parseFloat(p.querySelector(".val-pret").textContent)
        ).filter(v => !isNaN(v));
        
        let suma = preturi.reduce((a, b) => a + b, 0).toFixed(2);
        
        let div = document.createElement("div");
        div.textContent = `Suma prețurilor filtrate: ${suma} RON`;
        div.style.cssText = `
            position: fixed; bottom: 30px; left: 50%;
            transform: translateX(-50%);
            background: var(--mahon); color: white;
            padding: 15px 30px; border-radius: 10px;
            font-weight: bold; z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    });

    async function filtrareServerFetch() {
        const params = new URLSearchParams({
            nume: document.getElementById("inp-nume").value,
            categorie: document.getElementById("inp-categorie").value,
            expertiza: document.getElementById("inp-expertiza").value,
            pret: document.getElementById("inp-pret").value,
            sort1: document.getElementById("sort1").value,
            sort2: document.getElementById("sort2").value,
            ordine: document.getElementById("sens").value
        });

        try {
            const response = await fetch(`/filtrare-ajax?${params.toString()}`);
            if (!response.ok) throw new Error("Eroare la server");
            const htmlRezultat = await response.text();
            document.getElementById("container-produse").innerHTML = htmlRezultat;
        } catch (error) {
            console.error("Eroare fetch:", error);
        }
    }

    document.getElementById("btn-filtrare").addEventListener("click", () => {
        filtreazaProduse();
    });

    filtreazaProduse();
});