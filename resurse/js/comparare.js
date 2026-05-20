let produseComparare = JSON.parse(localStorage.getItem('produseComparare')) || [];
const INTERVAL_EXPIRARE = 24 * 60 * 60 * 1000;
let ultimaActiune = localStorage.getItem('timpUltimaComparare');
if (ultimaActiune && (new Date().getTime() - parseInt(ultimaActiune) > INTERVAL_EXPIRARE)) {
    produseComparare = [];
    localStorage.removeItem('produseComparare');
    localStorage.removeItem('timpUltimaComparare');
}

document.addEventListener("DOMContentLoaded", () => {
    actualizeazaInterfataComparare();
});

function adaugaLaComparare(element) {
    const id = element.getAttribute('data-id');
    const nume = element.getAttribute('data-nume');

    if (produseComparare.some(p => p.id === id)) return;

    if (produseComparare.length < 2) {
        produseComparare.push({ id, nume });
        salveazaStare();
        actualizeazaInterfataComparare();
    }
}

function stergeProdusComparare(id) {
    produseComparare = produseComparare.filter(p => p.id !== id);
    salveazaStare();
    actualizeazaInterfataComparare();
}

function salveazaStare() {
    localStorage.setItem('produseComparare', JSON.stringify(produseComparare));
    localStorage.setItem('timpUltimaComparare', new Date().getTime().toString());
}

function actualizeazaInterfataComparare() {
    const container = document.getElementById('container-comparare');
    const listaHtml = document.getElementById('lista-produse-comparare');
    const btnAfiseaza = document.getElementById('btn-lanseaza-comparare');
    const butoanePagina = document.querySelectorAll('.btn-compara');

    if (!container || !listaHtml) return;

    if (produseComparare.length === 0) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
    }

    btnAfiseaza.style.display = (produseComparare.length === 2) ? 'block' : 'none';

    listaHtml.innerHTML = '';
    produseComparare.forEach(p => {
        listaHtml.innerHTML += `
            <div class="item-comparare">
                <span>${p.nume}</span>
                <button class="btn-sterge-item" onclick="stergeProdusComparare('${p.id}')">&times;</button>
            </div>
        `;
    });

    butoanePagina.forEach(btn => {
        const idBtn = btn.getAttribute('data-id');
        
        if (produseComparare.length >= 2) {
            btn.disabled = true;
            btn.title = "ștergeți un produs din lista de comparare";
        } else {
            if (produseComparare.some(p => p.id === idBtn)) {
                btn.disabled = true;
                btn.removeAttribute('title');
            } else {
                btn.disabled = false;
                btn.removeAttribute('title');
            }
        }
    });
}

function deschidePaginaComparare() {
    if (produseComparare.length === 2) {
        window.open(`/compara?id1=${produseComparare[0].id}&id2=${produseComparare[1].id}`, 'Comparare Produse', 'width=800,height=600,scrollbars=yes');
    }
}