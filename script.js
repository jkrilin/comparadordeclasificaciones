document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const resetBtn = document.getElementById("resetBtn");
  const copyBtn = document.getElementById("copyBtn");

  let pageState = { old: 1, new: 1 };

  // =======================
  // ALERT UNIFICADO
  // =======================
  function showAlert(message, options = {}) {
    const oldPopup = document.querySelector(".popup-overlay");
    if (oldPopup) oldPopup.remove();

    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";

    const content = document.createElement("div");
    content.className = "popup-content";
    content.innerHTML = `<p>${message}</p>`;

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "popup-buttons";

    const okBtn = document.createElement("button");
    okBtn.className = "primary";
    okBtn.textContent = options.okText || "Aceptar";
    okBtn.onclick = () => {
      overlay.remove();
      if (typeof options.onOk === "function") options.onOk();
    };
    buttonsDiv.appendChild(okBtn);

    if (options.cancelText) {
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = options.cancelText;
      cancelBtn.onclick = () => {
        overlay.remove();
        if (typeof options.onCancel === "function") options.onCancel();
      };
      buttonsDiv.appendChild(cancelBtn);
    }

    content.appendChild(buttonsDiv);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  // =======================
  // PARSE CSV
  // =======================
  function parseCSV(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = e.target.result
        .split("\n")
        .map(r => r.split(","))
        .filter(r => r.length > 1);

      const headers = rows.shift().map(h => h.replace(/"/g, "").trim().toLowerCase());
      const cleanRows = rows.map(row => row.map(cell => cell.replace(/"/g, "").trim()));

      callback(cleanRows, headers);
    };
    reader.readAsText(file);
  }

  // =======================
  // MAPEO HTML -> CSV
  // =======================
  const columnMap = {
    "Posición": "position",
    "País": "countrycode",
    "Nombre": "name",
    "Puntos": "points",
    "Poles": "poles",
    "Victorias": "wins",
    "Top 5": "topfive",
    "Media Clasificación": "avgstart",
    "Media Final": "avgfinish",
    "Participaciones": "starts",
    "Vueltas Lideradas": "lapslead",
    "Incidentes": "incidents",
    "iRating": "custid",
    "Vueltas Totales": "laps"
  };

  // =======================
  // CONSTRUIR TABLA
  // =======================
function buildTable(data, headers, selectedCols, highlightDriver, page, size, type) {
  // --- TOTAL DE PILOTOS A MOSTRAR ---
  let parsedSize = parseInt(size);
  let totalToShow;
  if (isNaN(parsedSize) || parsedSize <= 0) {
    totalToShow = data.length;  // si está vacío => todos los pilotos
  } else {
    totalToShow = Math.min(parsedSize, data.length);
  }

  const limitedData = data.slice(0, totalToShow);

  // --- PILOTOS POR PÁGINA ---
  const perPage = 20;  // aquí controlas cuántos se ven en cada página
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const rows = limitedData.slice(start, end);

  // construir tabla
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "14px";
  table.style.textAlign = "center";
  table.style.border = "2px solid #000";

  // encabezado
  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  selectedCols.forEach(col => {
    const th = document.createElement("th");
    th.style.border = "1px solid #000";
    th.style.padding = "6px";
    th.textContent = col;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

   // =======================
  // CUERPO DE LA TABLA
  // =======================
  const tbody = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");

    // --- ÍNDICES CLAVE ---
    const posIndex = headers.indexOf("position"); // columna de posición
    const nameIndex = headers.indexOf("name");    // columna de nombre
    const pos = parseInt(row[posIndex]);          // posición del piloto en esta tabla
    const name = row[nameIndex];                  // nombre del piloto

    // =======================
    // COLORES PARA EL TOP 3
    // =======================
    if (pos === 1) {
      tr.style.background = "#FFD700"; // 🥇 Oro
    } else if (pos === 2) {
      tr.style.background = "#C0C0C0"; // 🥈 Plata
    } else if (pos === 3) {
      tr.style.background = "#CD7F32"; // 🥉 Bronce
    }

    // =======================
    // RESALTAR PILOTO DESTACADO
    // =======================
    if (name === highlightDriver) {
      tr.style.background = "#1976D2"; // Azul especial
      tr.style.color = "white";        // Texto blanco
    }

    // =======================
    // CELDAS DE CADA COLUMNA
    // =======================
    selectedCols.forEach(col => {
      const csvKey = columnMap[col];       // clave real del CSV
      const idx = headers.indexOf(csvKey); // posición de la columna
      let val = row[idx];                  // valor de la celda

      // Convertir a número si aplica
      if (val && !isNaN(val)) val = parseInt(val);

      // Mostrar bandera si es columna "País"
      if (col === "País" && val) {
        val = `<img src="https://flagcdn.com/h20/${val.toLowerCase()}.png" width="21" height="14">`;
      }

    // =======================
// ICONOS DE MOVIMIENTO (solo en tabla nueva)
// =======================
if (col === "Posición" && type === "new") {
  const oldIdx = window._oldData.findIndex(r => r[window._oldHeaders.indexOf("name")] === name);

  if (oldIdx !== -1) {
    const oldPos = parseInt(window._oldData[oldIdx][window._oldHeaders.indexOf("position")]);
    const diff = oldPos - pos;

    if (diff > 0) {
      val = `${val} <span style="color:#00c853; font-weight:bold;">⬆️${diff}</span>`;
    } else if (diff < 0) {
      val = `${val} <span style="color:#d50000; font-weight:bold;">⬇️${Math.abs(diff)}</span>`;
    } else {
      val = `${val} <span style="color:#888;">➖</span>`;
    }
  } else {
    val = `${val} <span style="color:#00c853; font-weight:bold;">🆕</span>`;
  }
}

      // Crear celda final
      const td = document.createElement("td");
      td.style.border = "1px solid #000";
      td.style.padding = "4px";
      td.innerHTML = val || "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);



  // --- PAGINACIÓN ---
  if (limitedData.length > perPage) {
    const totalPages = Math.ceil(limitedData.length / perPage);

    const nav = document.createElement("div");
    nav.style.marginTop = "10px";
    nav.style.display = "flex";
    nav.style.justifyContent = "center";
    nav.style.gap = "10px";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "⬅️ Anterior";
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => changePage(type, page - 1);

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Siguiente ➡️";
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => changePage(type, page + 1);

    const span = document.createElement("span");
    span.textContent = `Página ${page} de ${totalPages}`;

    nav.appendChild(prevBtn);
    nav.appendChild(span);
    nav.appendChild(nextBtn);

    const wrapper = document.createElement("div");
    wrapper.appendChild(table);
    wrapper.appendChild(nav);
    return wrapper;
  }

  return table;
}

  // =======================
  // RENDER TABLAS
  // =======================
  function renderTables(className, raceNumber, totalRaces) {
    const previewOld = document.getElementById("preview-old");
    const previewNew = document.getElementById("preview-new");

    previewOld.innerHTML = "";
    previewNew.innerHTML = "";

    // tabla anterior
    const oldTitle = document.createElement("h3");
    oldTitle.textContent = `${className} (anterior)`;
    previewOld.appendChild(oldTitle);
    previewOld.appendChild(buildTable(window._oldData, window._oldHeaders, window._selectedCols, window._highlightDriver, pageState.old, window._size, "old"));

    // tabla nueva
    const newTitle = document.createElement("h3");
    newTitle.textContent = `${className} (nueva)`;
    previewNew.appendChild(newTitle);
    previewNew.appendChild(buildTable(window._newData, window._newHeaders, window._selectedCols, window._highlightDriver, pageState.new, window._size, "new"));

    // extras SIEMPRE debajo
    const extras = document.createElement("div");
    extras.style.marginTop = "15px";

    if (raceNumber && totalRaces) {
      const info = document.createElement("div");
      info.style.textAlign = "right";
      info.style.marginTop = "10px";
      info.innerHTML = `<strong>Actualizado a ${raceNumber}/${totalRaces} carreras</strong>`;
      extras.appendChild(info);
    }

    if (document.getElementById("show-legend").checked) {
      const legend = document.createElement("div");
      legend.style.marginTop = "10px";
      legend.innerHTML = `
        <strong>🔎 Leyenda de movimientos:</strong><br>
        <span style="color:#00c853; font-weight:bold;">▲X</span> = Sube<br>
        <span style="color:#d50000; font-weight:bold;">▼-X</span> = Baja<br>
        <span style="color:#888;">➖</span> = Igual<br>
        <span style="color:#00c853; font-weight:bold;">🆕</span> = Nueva entrada
      `;
      extras.appendChild(legend);
    }

    if (extras.innerHTML.trim() !== "") {
      previewNew.appendChild(extras);
    }
  }

  // =======================
  // EVENTOS
  // =======================
  generateBtn.addEventListener("click", () => {
    const oldFile = document.getElementById("oldFile").files[0];
    const newFile = document.getElementById("newFile").files[0];
    const className = document.getElementById("className").value || "CLASIFICACIÓN";
    const highlightDriver = document.getElementById("highlightDriver").value || "";
    const raceNumber = document.getElementById("raceNumber").value;
    const totalRaces = document.getElementById("totalRaces").value;
    let sizeInput = document.getElementById("size").value.trim();
const size = sizeInput === "" ? null : parseInt(sizeInput);

   const selectedCols = Array.from(
  document.querySelectorAll(".columns-horizontal input[type=checkbox]:checked")
)
  .map(cb => cb.nextElementSibling.textContent)
  .filter(col => columnMap[col]); // 👈 solo columnas válidas del CSV
	  

    if (selectedCols.length === 0) {
      showAlert("⚠️ Debes seleccionar al menos una columna.");
      return;
    }
    if (!oldFile || !newFile) {
      showAlert("⚠️ Debes subir los dos archivos CSV.");
      return;
    }

    parseCSV(oldFile, (oldData, oldHeaders) => {
      parseCSV(newFile, (newData, newHeaders) => {
        window._oldData = oldData;
        window._newData = newData;
        window._oldHeaders = oldHeaders;
        window._newHeaders = newHeaders;
        window._selectedCols = selectedCols;
        window._highlightDriver = highlightDriver;
        window._size = size;

        pageState.old = 1;
        pageState.new = 1;

        renderTables(className, raceNumber, totalRaces);
        copyBtn.disabled = false;
      });
    });
  });

  window.changePage = function (type, newPage) {
    pageState[type] = newPage;
    const className = document.getElementById("className").value || "CLASIFICACIÓN";
    const raceNumber = document.getElementById("raceNumber").value;
    const totalRaces = document.getElementById("totalRaces").value;
    renderTables(className, raceNumber, totalRaces);
  };

// =======================
// BOTÓN COPIAR HTML
// =======================
copyBtn.addEventListener("click", () => {
  const table = document.querySelector("#preview-new table");
  if (!table) {
    showAlert("⚠️ No hay tabla generada todavía.");
    return;
  }

  // --- Forzar estilos de tabla ---
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "14px";
  table.style.textAlign = "center";
  table.style.border = "2px solid #000";

  // --- Forzar estilos en TH ---
  table.querySelectorAll("th").forEach(th => {
    th.style.border = "1px solid #000";
    th.style.padding = "6px";
  });

  // --- Forzar estilos en TD ---
  table.querySelectorAll("td").forEach(td => {
    td.style.border = "1px solid #000";
    td.style.padding = "6px";
  });

  // ====== TÍTULO EDITABLE DESDE INTERFAZ ======
  const titleInput = document.querySelector("#title-input");
  const championshipTitle = titleInput && titleInput.value.trim() !== "" 
    ? titleInput.value.trim() 
    : "CLASIFICACIÓN NIS 2025";

  // Bloque contenedor
  const wrapper = document.createElement("div");
  wrapper.style.fontFamily = "Arial, sans-serif";
  wrapper.style.maxWidth = "100%";
  wrapper.style.margin = "auto";

  // Título
  const title = document.createElement("div");
  title.style.textAlign = "center";
  title.style.fontSize = "22px";
  title.style.background = "#D32F2F";
  title.style.color = "white";
  title.style.padding = "14px";
  title.style.fontWeight = "bold";
  title.style.borderRadius = "10px 10px 0 0";
  title.setAttribute("colspan", "6");
  title.textContent = championshipTitle;

  // Contenedor tabla
  const tableContainer = document.createElement("div");
  tableContainer.style.width = "100%";
  tableContainer.style.overflowX = "auto";

  const clonedTable = table.cloneNode(true);
  tableContainer.appendChild(clonedTable);

  wrapper.appendChild(title);
  wrapper.appendChild(tableContainer);

  // ====== SALIDAS DEL TOP 20 ======
  const showExits = document.querySelector("#show-exits");
  if (showExits && showExits.checked) {
    const exits = document.createElement("div");
    exits.style.marginTop = "20px";
    exits.style.border = "2px solid #000";
    exits.style.padding = "10px";
    exits.style.backgroundColor = "#f9f9f9";

    // Aquí podrías poner dinámico los pilotos que salieron, ahora es ejemplo:
    exits.innerHTML = `
      <h3 style="margin-top: 0; color: #D32F2F;">✅ Nadie sale del Top 20</h3>
    `;
    wrapper.appendChild(exits);
  }

  // ====== LEYENDA ======
  const showLegend = document.querySelector("#show-legend");
  if (showLegend && showLegend.checked) {
    // Comprobar si queremos mostrar actualizado
    const showUpdated = document.querySelector("#show-updated");
    const carreraInput = document.querySelector("#race-number");
    const totalInput = document.querySelector("#race-total");

    let updatedText = "";
    if (showUpdated && showUpdated.checked && carreraInput && totalInput) {
      const carrera = carreraInput.value || "?";
      const total = totalInput.value || "?";
      updatedText = `
        <div style="text-align: right; font-style: italic; color: #555;">
          <strong>Actualizado a ${carrera}/${total} carreras</strong>
        </div>
      `;
    }

    const legend = document.createElement("div");
    legend.style.marginTop = "15px";
    legend.style.fontSize = "13px";
    legend.style.color = "#333";
    legend.style.display = "flex";
    legend.style.justifyContent = "space-between";
    legend.style.alignItems = "center";
    legend.style.padding = "0 10px";

    legend.innerHTML = `
      <div>
        <strong>🔎 Leyenda de movimientos:</strong><br>
        <span style="color:#00c853; font-weight:bold;">▲X</span> = Sube X posiciones<br>
        <span style="color:#d50000; font-weight:bold;">▼-X</span> = Baja X posiciones<br>
        <span style="color:#888;">➖</span> = Mantiene posición<br>
        <span style="color:#00c853; font-weight:bold;">🆕</span> = Nueva entrada al Top 20
      </div>
      ${updatedText}
    `;
    wrapper.appendChild(legend);
  }

  // Convertir a HTML para copiar
  const html = wrapper.outerHTML;

  navigator.clipboard.writeText(html).then(() => {
    showAlert("✅ Copiado con título, tabla, leyenda y salidas (si están activadas)");
  }).catch(err => {
    showAlert("❌ Error al copiar: " + err);
  });
});





  resetBtn.addEventListener("click", () => {
    showAlert("⚠️ Se restablecerá todo a 0. ¿Quieres continuar?", {
      okText: "Aceptar",
      cancelText: "Cancelar",
      onOk: () => {
        document.querySelectorAll("input").forEach(inp => {
          if (inp.type === "checkbox") inp.checked = false;
          else inp.value = "";
        });
        document.querySelectorAll("input[value=position],input[value=country],input[value=name]").forEach(cb => cb.checked = true);
        document.getElementById("preview-old").innerHTML = "";
        document.getElementById("preview-new").innerHTML = "";
        copyBtn.disabled = true;
      }
    });
  });
});
