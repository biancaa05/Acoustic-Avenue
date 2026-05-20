window.addEventListener("DOMContentLoaded", function() {
    const selectTema = document.getElementById("select-tema");
    const body = document.body;
    
    // Referințe către iconițe
    const icons = {
        light: document.getElementById("icon-light"),
        dark: document.getElementById("icon-dark"),
        forest: document.getElementById("icon-forest")
    };

    function aplicaTema(tema) {
        // 1. Schimbăm clasa pe body
        body.classList.remove("light", "dark", "forest");
        body.classList.add(tema);
        
        // 2. Schimbăm iconița vizibilă
        Object.keys(icons).forEach(key => {
            if (icons[key]) {
                icons[key].classList.toggle("d-none", key !== tema);
            }
        });

        // 3. Actualizăm selectul
        if (selectTema) selectTema.value = tema;
        
        // 4. Salvăm alegerea
        localStorage.setItem("tema", tema);
    }

    // Inițializare la încărcarea paginii
    const temaSalvata = localStorage.getItem("tema") || "light";
    aplicaTema(temaSalvata);

    // Event listener pentru schimbare
    if (selectTema) {
        selectTema.addEventListener("change", function() {
            aplicaTema(this.value);
        });
    }
});