var temporizatorInchidere;

function afiseazaOrar() {
    const modal = document.getElementById('modal-orar');
    if (!modal) return;
    
    modal.style.display = 'flex';
    actualizeazaStareOrar();

    clearTimeout(temporizatorInchidere);
    temporizatorInchidere = setTimeout(() => {
        inchideOrar();
    }, 10000);
}

function inchideOrar() {
    const modal = document.getElementById('modal-orar');
    if (modal) modal.style.display = 'none';
    clearTimeout(temporizatorInchidere);
}

function actualizeazaStareOrar() {
    const acum = new Date();
    const ziuaCurenta = acum.getDay();
    const oraCurenta = acum.getHours();
    const minuteCurente = acum.getMinutes();
    
    const randuri = document.querySelectorAll('.rand-orar');
    randuri.forEach(rand => {
        if (parseInt(rand.getAttribute('data-zi')) === ziuaCurenta) {
            rand.classList.add('zi-activa-marcare');
        } else {
            rand.classList.remove('zi-activa-marcare');
        }
    });

    const divStare = document.getElementById('stare-firma');
    if (!divStare) return;

    const interval = programConfig[ziuaCurenta];
    if (!interval) {
        seteazaFirmaInchisă(divStare);
        return;
    }

    const momentCurent = oraCurenta * 60 + minuteCurente;
    const momentDeschidere = interval[0] * 60 + interval[1];
    const momentInchidere = interval[2] * 60 + interval[3];

    if (momentCurent >= momentDeschidere && momentCurent < momentInchidere) {
        divStare.className = 'status-deschis';
        divStare.innerHTML = '🟢 ACUM ESTE: DESCHIS';
    } else {
        seteazaFirmaInchisă(divStare);
    }
}

function seteazaFirmaInchisă(element) {
    element.className = 'status-inchis';
    element.innerHTML = '🔴 ACUM ESTE: ÎNCHIS';
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal-orar');
    if (event.target === modal) {
        inchideOrar();
    }
});
