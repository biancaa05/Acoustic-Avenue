window.addEventListener("DOMContentLoaded", function() {
    const timerDiv = document.getElementById("timer-oferta");
    
    // Verificăm dacă suntem pe pagina care are timer (index)
    if (!timerDiv) return;

    // Citim data de finalizare din atributul EJS
    const dataFinalStr = timerDiv.getAttribute("data-finalizare");
    const dataFinal = new Date(dataFinalStr).getTime();

    // Dacă data e invalidă sau expirată, nu pornim
    if (isNaN(dataFinal)) {
        console.error("Data de finalizare invalidă:", dataFinalStr);
        return;
    }

    const intervalId = setInterval(function() {
        const acum = new Date().getTime();
        const distanta = dataFinal - acum;

        // Dacă a expirat
        if (distanta <= 0) {
            clearInterval(intervalId);
            timerDiv.innerHTML = "00:00:00";
            // Refresh după 1.5 secunde pentru a încărca noua ofertă
            setTimeout(() => { location.reload(); }, 1500);
            return;
        }

        // Calcul ore, minute, secunde
        const ore = Math.floor((distanta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minute = Math.floor((distanta % (1000 * 60 * 60)) / (1000 * 60));
        const secunde = Math.floor((distanta % (1000 * 60)) / 1000);

        // Afișare cu formatare 00:00:00
        timerDiv.innerHTML = 
            (ore < 10 ? "0" + ore : ore) + ":" + 
            (minute < 10 ? "0" + minute : minute) + ":" + 
            (secunde < 10 ? "0" + secunde : secunde);

        // BONUS 12.3: Marcare ultimele 10 secunde
        if (distanta < 10000) {
            timerDiv.style.color = "red";
            timerDiv.style.borderColor = "red";
            // Adaugă o clasă de animație dacă ai în CSS
            timerDiv.classList.add("pulse-timer"); 
        }
    }, 1000);
});