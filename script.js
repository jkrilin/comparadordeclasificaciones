document.addEventListener("DOMContentLoaded", () => { 

  const generateBtn = document.getElementById("generateBtn");  
  const resetBtn = document.getElementById("resetBtn");        
  const SeeBtn = document.getElementById("SeeBtn");          
  const loadFilesBtn = document.getElementById("loadFilesBtn");
  const progressBar = document.getElementById("progressBar");  
  const progressText = document.getElementById("progressText");
  const oldFileInfo = document.getElementById("oldFileInfo");  
  const newFileInfo = document.getElementById("newFileInfo");  
  const updateBtn = document.getElementById("updateBtn");

  let pageState = { old: 1, new: 1 };
  let selectedCols = [];
  let tempSelected = [];

  // --- FUNCIONES UNIFICADAS ---
  function findColumnIndex(headers, possibleKeys) {
    for (const key of possibleKeys) {
      const idx = headers.indexOf(key.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function getValueFromRow(row, headers, possibleKeys) {
    for (const key of possibleKeys) {
      const idx = headers.indexOf(key.toLowerCase());
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== "") {
        return row[idx];
      }
    }
    return "";
  }

  function createDriverInfoDiv(name, countryCodeRaw, pointsRaw) {
    const countryCode = countryCodeRaw ? countryCodeRaw.toLowerCase() : "";
    const points = pointsRaw && !isNaN(pointsRaw) ? Number(pointsRaw).toLocaleString('es-ES') : pointsRaw;

    const driverDiv = document.createElement("div");
    driverDiv.classList.add("driver-exit");

    driverDiv.innerHTML = `
      ${countryCode ? `<img src="https://flagcdn.com/h20/${countryCode}.png" width="21" height="14" alt="Bandera">` : ""}
      <strong>${name}</strong> - ${points} puntos
    `;
    return driverDiv;
  }

  function getPositionChange(oldPositions, name, newPos) {
    if (!(name in oldPositions)) return {icon: "🆕", text: "Nueva entrada"};
    const oldPos = oldPositions[name];
    const diff = oldPos - newPos;

    if (diff > 0) return {icon: `▲${diff}`, text: `Subió ${diff} posiciones`};
    if (diff < 0) return {icon: `▼${-diff}`, text: `Bajó ${-diff} posiciones`};
    return {icon: "➖", text: "Misma posición"};
  }

  // --- BLOQUEO DE LA WEB ---
  const restOfPage = document.querySelectorAll("fieldset:not(.options-block:first-child)");
  function disablePage() {
    restOfPage.forEach(fs => {
      fs.style.pointerEvents = "none"; 
      fs.style.opacity = "0.5";        
    });
  }
  function enablePage() {
    restOfPage.forEach(fs => {
      fs.style.pointerEvents = "auto"; 
      fs.style.opacity = "1";
    });
  }
  disablePage();

  // --- ALERTA POPUP ---
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

  // --- POPUP ELECCIÓN DE NOMBRE ---
  function askFileNameChoice(originalName, simplifiedName, callback, cancelCallback) {
    const oldPopup = document.querySelector(".popup-overlay");
    if (oldPopup) oldPopup.remove();

    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";

    const content = document.createElement("div");
    content.className = "popup-content";
    content.innerHTML = `
      <p>Elige el nombre que prefieres mostrar:</p>
      <label><input type="radio" name="fileNameChoice" value="original" checked> <strong>Original</strong></label><br>
      <label><input type="radio" name="fileNameChoice" value="simplified"> <strong>Automático:</strong> ${simplifiedName || "(no disponible)"}</label><br>
      <label><input type="radio" name="fileNameChoice" value="manual"> <strong>Personalizado:</strong></label>
      <input type="text" id="manualFileName" placeholder="Escribe un nombre aquí"
             style="margin-top:8px; width:90%; display:block; margin-bottom:12px;">
    `;

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "popup-buttons";

    const okBtn = document.createElement("button");
    okBtn.className = "primary";
    okBtn.textContent = "Aceptar";
    okBtn.onclick = () => {
      const choice = document.querySelector("input[name='fileNameChoice']:checked").value;
      let finalName = originalName;
      if (choice === "simplified" && simplifiedName) finalName = simplifiedName;
      if (choice === "manual") {
        const manual = document.getElementById("manualFileName").value.trim();
        if (manual) finalName = manual;
      }
      overlay.remove();
      callback(finalName);
    };
    buttonsDiv.appendChild(okBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancelar";
    cancelBtn.onclick = () => {
      overlay.remove();
      if (typeof cancelCallback === "function") cancelCallback();
    };
    buttonsDiv.appendChild(cancelBtn);

    content.appendChild(buttonsDiv);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  // --- PARSEAR CSV ---
  function parseCSV(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = e.target.result
        .split("\n")
        .map(r => r.split(","))
        .filter(r => r.length > 1);

      if (!rows.length) {
        showAlert("⚠️ El archivo está vacío o no es válido.");
        return;
      }

      const headers = rows.shift().map(h => h.replace(/"/g, "").trim().toLowerCase());
      const cleanRows = rows.map(row => row.map(cell => cell.replace(/"/g, "").trim()));
      callback(cleanRows, headers);
    };
    reader.readAsText(file);
  }

  // --- NOMBRE SIMPLIFICADO ---
  function getSimplifiedName(filename) {
    const seriesMatch = filename.match(/season-driver_(.*?)_-_/i);
    let seriesName = seriesMatch ? seriesMatch[1].replace(/_/g, " ") : "";

    let match = filename.match(/(\d{4})_Season_(\d+).*div_(\d+|all)/i);
    if (match) return `${match[1]} Season ${seriesName} ${match[2]} Div ${match[3]}`;

    match = filename.match(/(\d{4})_Season_Open.*div_(\d+|all)/i);
    if (match) return `${match[1]} Season ${seriesName} Open Div ${match[2]}`;

    match = filename.match(/(\d{4})_Season_(\d+)/i);
    if (match) return `${match[1]} Season ${seriesName} ${match[2]}`;

    match = filename.match(/(\d{4})_Season_Open/i);
    if (match) return `${match[1]} Season ${seriesName} Open`;

    return null;
  }

  // --- SELECCIÓN DE ARCHIVO con popup ---
  function handleFileSelection(inputElement, infoElement, setAsClassName = false) {
    inputElement.addEventListener("change", () => {
      const file = inputElement.files[0];
      if (!file) return;

      const simplified = getSimplifiedName(file.name);

      askFileNameChoice(
        file.name,
        simplified,
        (chosenName) => {
          infoElement.dataset.filename = chosenName;
          infoElement.textContent = chosenName;
          if (setAsClassName) {
            document.getElementById("className").value = "";
          }
        },
        () => {
          inputElement.value = "";
          infoElement.dataset.filename = "";
          infoElement.textContent = "";
        }
      );
    });
  }
  handleFileSelection(document.getElementById("oldFile"), oldFileInfo, true);
  handleFileSelection(document.getElementById("newFile"), newFileInfo, false);

  // --- BOTÓN CARGAR ARCHIVOS ---
  loadFilesBtn.addEventListener("click", () => {
    const oldFile = document.getElementById("oldFile").files[0];
    const newFile = document.getElementById("newFile").files[0];

    if (!oldFile || !newFile) {
      showAlert("⚠️ Debes seleccionar ambos archivos CSV antes de cargar.");
      return;
    }

    const progressContainer = document.querySelector(".progress-container");
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "";

    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${progress}%`;

      if (progress >= 100) {
        clearInterval(interval);

        progressText.textContent = "✅ Cargado exitosamente";

        setTimeout(() => {
          progressContainer.style.display = "none";
          progressText.textContent = "";
        }, 1000);

        parseCSV(oldFile, (oldData, oldHeaders) => {
          window._oldData = oldData;
          window._oldHeaders = oldHeaders;
          const chosenName = oldFileInfo.dataset.filename || oldFile.name;
          oldFileInfo.innerHTML = `${chosenName}<br><small>${oldData.length.toLocaleString("es-ES")} registros cargados ✅</small>`;
        });

        parseCSV(newFile, (newData, newHeaders) => {
          window._newData = newData;
          window._newHeaders = newHeaders;
          const chosenName = newFileInfo.dataset.filename || newFile.name;
          newFileInfo.innerHTML = `${chosenName}<br><small>${newData.length.toLocaleString("es-ES")} registros cargados ✅</small>`;
        });

        enablePage();
        loadFilesBtn.disabled = true;
        loadFilesBtn.classList.add("disabled");
      }
    }, 20);
  });

  // --- GESTIÓN DE COLUMNAS ---
  const columnsList = document.getElementById("columnsList");
  const addColumnBtn = document.getElementById("addColumnBtn");
  const selectedColumnsDiv = document.getElementById("selectedColumns");

  columnsList.addEventListener("click", e => {
    if (e.target.tagName === "SPAN") {
      e.target.classList.toggle("selected");
      const value = e.target.dataset.value;
      const text = e.target.textContent;

      if (e.target.classList.contains("selected")) {
        tempSelected.push({ value, text });
      } else {
        tempSelected = tempSelected.filter(c => c.value !== value);
      }
    }
  });

  addColumnBtn.addEventListener("click", () => {
    if (tempSelected.length === 0) {
      showAlert("⚠️ Selecciona columnas antes de añadir.");
      return;
    }

    tempSelected.forEach(sel => {
      if (selectedCols.find(c => c.value === sel.value)) return;

      selectedCols.push(sel);

      const tag = document.createElement("div");
      tag.className = "column-tag";
      tag.draggable = true;
      tag.dataset.value = sel.value;
      tag.textContent = sel.text;

      tag.ondblclick = () => {
        selectedCols = selectedCols.filter(c => c.value !== sel.value);
        tag.remove();
        updateBtn.disabled = false;
        updateBtn.classList.remove("disabled");
      };

      tag.addEventListener("dragstart", () => tag.classList.add("dragging"));
      tag.addEventListener("dragend", () => {
        tag.classList.remove("dragging");
        updateBtn.disabled = false;
        updateBtn.classList.remove("disabled");
      });

      selectedColumnsDiv.appendChild(tag);
    });

    tempSelected = [];
    [...columnsList.querySelectorAll("span")].forEach(el => el.classList.remove("selected"));

    updateBtn.disabled = false;
    updateBtn.classList.remove("disabled");
  });

  selectedColumnsDiv.addEventListener("dragover", e => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(selectedColumnsDiv, e.clientX);
    if (afterElement == null) {
      selectedColumnsDiv.appendChild(dragging);
    } else {
      selectedColumnsDiv.insertBefore(dragging, afterElement);
    }
  });

  function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll(".column-tag:not(.dragging)")];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // --- HABILITAR BOTÓN ACTUALIZAR AL CAMBIAR INPUTS O CHECKBOXES ---
  function setupUpdateOnChange(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const eventName = (el.type === "checkbox") ? "change" : "input";
    el.addEventListener(eventName, () => {
      if (generateBtn.disabled) {
        updateBtn.disabled = false;
        updateBtn.classList.remove("disabled");
      }
    });
  }

  [
    "className",
    "highlightDriver",
    "size",
    "raceNumber",
    "totalRaces",
    "show-legend",
    "show-exits"
  ].forEach(id => setupUpdateOnChange(id));

  // --- CREAR TABLA ---
  function buildTable(data, headers, selectedCols, highlightDriver, page, size, type) {
    let parsedSize = parseInt(size);
    let totalToShow = isNaN(parsedSize) || parsedSize <= 0 ? data.length : Math.min(parsedSize, data.length);
    const limitedData = data.slice(0, totalToShow);
    const rows = limitedData.slice((page - 1) * 20, page * 20);

    let oldPositionsMap = {};
    if (type === "new" && window._oldData && window._oldHeaders) {
      const posIdxOld = findColumnIndex(window._oldHeaders, ["position"]);
      const nameIdxOld = findColumnIndex(window._oldHeaders, ["name"]);
      window._oldData.forEach(row => {
        const name = row[nameIdxOld];
        const pos = parseInt(row[posIdxOld]);
        oldPositionsMap[name] = pos;
      });
    }

    const wrapper = document.createElement("div");
    wrapper.classList.add("scroll-container");

    const table = document.createElement("table");
    table.classList.add("classification-table");
    table.style.width = "auto";  // para ajuste al contenido

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    selectedCols.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col.text;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const posIdxNew = findColumnIndex(headers, ["position"]);
    const nameIdxNew = findColumnIndex(headers, ["name"]);

    rows.forEach(row => {
      const tr = document.createElement("tr");

      const pos = parseInt(row[posIdxNew]);
      const name = row[nameIdxNew];

      if (pos === 1) tr.classList.add("pos-gold");
      else if (pos === 2) tr.classList.add("pos-silver");
      else if (pos === 3) tr.classList.add("pos-bronze");

      if (name === highlightDriver) tr.classList.add("highlight-driver");

      selectedCols.forEach(col => {
        const idx = findColumnIndex(headers, [col.value]);
        let val = row[idx];
        if (!isNaN(val) && val !== "") val = parseInt(val);

        if (col.text === "País" && val) {
          val = `<img src="https://flagcdn.com/h20/${val.toLowerCase()}.png" width="21" height="14" alt="Bandera">`;
        }

        const td = document.createElement("td");

        if (col.value === "position" && type === "new") {
          const oldPos = oldPositionsMap[name];
          if (oldPos !== undefined) {
            const diff = oldPos - pos;
            if (diff > 0) {
              td.innerHTML = `${pos} <span class="pos-up">▲${diff}</span>`;
            } else if (diff < 0) {
              td.innerHTML = `${pos} <span class="pos-down">▼${Math.abs(diff)}</span>`;
            } else {
              td.innerHTML = `${pos} <span class="pos-same">➖</span>`;
            }
          } else {
            td.innerHTML = `${pos} <span class="pos-new">🆕</span>`;
          }
        } else {
          td.innerHTML = (val === "" || val === undefined) ? "0" : val;
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  // --- PAGINACIÓN ---
  function renderPagination(container, type, total) {
    const sizeInput = document.getElementById("size").value.trim();
    const size = sizeInput === "" ? total : parseInt(sizeInput);
    const totalToShow = Math.min(size, total);
    const totalPages = Math.ceil(totalToShow / 20);

    container.innerHTML = "";

    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀️";
    prevBtn.disabled = pageState[type] === 1;
    prevBtn.addEventListener("click", () => {
      if (pageState[type] > 1) {
        pageState[type]--;
        const className = document.getElementById("className").value || "CLASIFICACIÓN";
        const raceNumber = document.getElementById("raceNumber").value;
        const totalRaces = document.getElementById("totalRaces").value;
        renderTables(className, raceNumber, totalRaces);
      }
    });
    container.appendChild(prevBtn);

    const info = document.createElement("span");
    info.style.marginLeft = "8px";
    info.textContent = `Página ${pageState[type]} de ${totalPages}`;
    container.appendChild(info);

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "▶️";
    nextBtn.disabled = pageState[type] === totalPages;
    nextBtn.addEventListener("click", () => {
      if (pageState[type] < totalPages) {
        pageState[type]++;
        const className = document.getElementById("className").value || "CLASIFICACIÓN";
        const raceNumber = document.getElementById("raceNumber").value;
        const totalRaces = document.getElementById("totalRaces").value;
        renderTables(className, raceNumber, totalRaces);
      }
    });
    container.appendChild(nextBtn);
  }

 // --- RENDER TÍTULOS CAMPEONATO ---
function renderChampionshipTitles(className) {
  const previewOldBox = document.querySelector("#preview-old").closest(".preview-box");
  const previewNewBox = document.querySelector("#preview-new").closest(".preview-box");

  // Eliminar títulos previos para evitar duplicados
  previewOldBox.querySelectorAll(".championship-title").forEach(el => el.remove());
  previewNewBox.querySelectorAll(".championship-title").forEach(el => el.remove());

  if (className && className.trim() !== "") {
    const titleElOld = document.createElement("h2");
    titleElOld.textContent = className.trim();
    titleElOld.classList.add("championship-title");

    const titleElNew = titleElOld.cloneNode(true);

    const oldH3 = previewOldBox.querySelector("h3");
    const newH3 = previewNewBox.querySelector("h3");

    oldH3.insertAdjacentElement('afterend', titleElOld);
    newH3.insertAdjacentElement('afterend', titleElNew);
  }
}


  // --- RENDER TABLAS Y EXTRAS ---
  function renderTables(className, raceNumber, totalRaces) {
    const previewOld = document.getElementById("preview-old");
    const previewNew = document.getElementById("preview-new");
    const pagOld = document.getElementById("pagination-old");
    const pagNew = document.getElementById("pagination-new");
	

    previewOld.innerHTML = "";
    previewNew.innerHTML = "";
    pagOld.innerHTML = "";
    pagNew.innerHTML = "";

    // Mapa posiciones antiguas para comparación
    const oldPositionsMap = {};
    window._oldData?.forEach(row => {
      const name = getValueFromRow(row, window._oldHeaders, ["name"]);
      const pos = parseInt(getValueFromRow(row, window._oldHeaders, ["position"]));
      oldPositionsMap[name] = pos;
    });
    window._oldPositions = oldPositionsMap;

  

    // Mostrar tabla antigua
    previewOld.appendChild(buildTable(window._oldData, window._oldHeaders, selectedCols, window._highlightDriver, pageState.old, document.getElementById("size").value.trim() || null, "old"));
    renderPagination(pagOld, "old", window._oldData.length);

    // Mostrar tabla nueva
    previewNew.appendChild(buildTable(window._newData, window._newHeaders, selectedCols, window._highlightDriver, pageState.new, document.getElementById("size").value.trim() || null, "new"));
    renderPagination(pagNew, "new", window._newData.length);
	
	  // Mostrar título campeonato si existe
    renderChampionshipTitles(className);

    // Limpiar extras previos
    const existingExtras = pagNew.nextElementSibling;
    if (existingExtras && existingExtras.classList.contains("extras-container")) {
      existingExtras.remove();
    }

    // Crear contenedor extras
    const extras = document.createElement("div");
    extras.className = "extras-container";
    pagNew.insertAdjacentElement("afterend", extras);

    // Mostrar pilotos que salieron del Top 20 solo si está seleccionado
    const showExits = document.getElementById("show-exits")?.checked;
    if (showExits) {
      const oldTop20 = window._oldData.slice(0, 20).map(row => getValueFromRow(row, window._oldHeaders, ["name"]));
      const newTop20 = window._newData.slice(0, 20).map(row => getValueFromRow(row, window._newHeaders, ["name"]));
      const exitedDrivers = oldTop20.filter(name => !newTop20.includes(name));

      if (exitedDrivers.length > 0) {
        const exitContainer = document.createElement("div");
        exitContainer.classList.add("exits-list");

        const exitCountDiv = document.createElement("div");
        exitCountDiv.classList.add("exit-count");
        exitCountDiv.textContent = `❌ Salieron ${exitedDrivers.length} piloto(s) del Top 20`;
        exitContainer.appendChild(exitCountDiv);

        exitedDrivers.forEach(name => {
          const driverRow = window._oldData.find(row => getValueFromRow(row, window._oldHeaders, ["name"]) === name);
          if (!driverRow) return;

          const countryCodeRaw = getValueFromRow(driverRow, window._oldHeaders, ["country", "país"]);
          const pointsRaw = getValueFromRow(driverRow, window._oldHeaders, ["points", "puntos"]);

          const driverDiv = createDriverInfoDiv(name, countryCodeRaw, pointsRaw);
          exitContainer.appendChild(driverDiv);
        });

        extras.appendChild(exitContainer);
      }
    }

    // Mostrar leyenda movimientos solo si está seleccionado
    if (document.getElementById("show-legend")?.checked) {
      const legendDiv = document.createElement("div");
      legendDiv.classList.add("legend-movements");

      let updateText = "";
      if (
        raceNumber !== undefined && raceNumber !== null && raceNumber.toString().trim() !== "" &&
        totalRaces !== undefined && totalRaces !== null && totalRaces.toString().trim() !== ""
      ) {
        updateText = `<div class="legend-update-text">
          <strong>Actualizado a ${raceNumber}/${totalRaces} carreras</strong>
        </div>`;
      }

      legendDiv.innerHTML = `
        <strong>🔎 Leyenda de movimientos:</strong><br>
        <span class="pos-up">▲X</span> = Sube X posiciones<br>
        <span class="pos-down">▼-X</span> = Baja X posiciones<br>
        <span class="pos-same">➖</span> = Mantiene posición<br>
        <span class="pos-new">🆕</span> = Nueva entrada al Top 20
        ${updateText}
      `;

      extras.appendChild(legendDiv);
    }
  }

  // --- ACTUALIZAR CLASIFICACIÓN ---
  updateBtn.addEventListener("click", () => {
    if (updateBtn.disabled) return;

    selectedCols = [...document.querySelectorAll("#selectedColumns .column-tag")].map(tag => ({
      value: tag.dataset.value,
      text: tag.textContent
    }));

    const className = document.getElementById("className").value;
    const raceNumber = document.getElementById("raceNumber").value;
    const totalRaces = document.getElementById("totalRaces").value;

    renderTables(className, raceNumber, totalRaces);

    updateBtn.disabled = true;
    updateBtn.classList.add("disabled");
  });

  // --- GENERAR CLASIFICACIÓN ---
  generateBtn.addEventListener("click", () => {
    const oldFile = window._oldData;
    const newFile = window._newData;
    const className = document.getElementById("className").value;
    const highlightDriver = document.getElementById("highlightDriver").value || "";
    const raceNumber = document.getElementById("raceNumber").value;
    const totalRaces = document.getElementById("totalRaces").value;
    let sizeInput = document.getElementById("size").value.trim();
    const size = sizeInput === "" ? null : parseInt(sizeInput);

    if (!oldFile || !newFile) {
      showAlert("⚠️ Antes debes cargar los archivos CSV.");
      return;
    }
    if (selectedCols.length === 0) {
      showAlert("⚠️ Debes seleccionar al menos una columna.");
      return;
    }

    window._highlightDriver = highlightDriver;

    renderTables(className, raceNumber, totalRaces);

    SeeBtn.disabled = false;
    generateBtn.disabled = true;
    generateBtn.classList.add("disabled");
    updateBtn.disabled = false;
    updateBtn.classList.remove("disabled");
    loadFilesBtn.disabled = true;
    loadFilesBtn.classList.add("disabled");
  });

  // --- RESETEAR TODO ---
  resetBtn.addEventListener("click", () => {
    showAlert("⚠️ Se restablecerá todo a 0. ¿Quieres continuar?", {
      okText: "Aceptar",
      cancelText: "Cancelar",
      onOk: () => {
        document.querySelectorAll("input").forEach(inp => {
          if (inp.type === "checkbox") inp.checked = false;
          else inp.value = "";
        });
        selectedCols = [];
        tempSelected = [];
        selectedColumnsDiv.innerHTML = "";
        [...columnsList.querySelectorAll("span")].forEach(el => el.classList.remove("selected"));
        document.getElementById("preview-old").innerHTML = "";
        document.getElementById("preview-new").innerHTML = "";
        SeeBtn.disabled = true;

        restOfPage.forEach(fs => {
          fs.style.pointerEvents = "none";
          fs.style.opacity = "0.5";
        });
        oldFileInfo.textContent = "";
        newFileInfo.textContent = "";
        document.querySelector(".progress-container").style.display = "none";
        loadFilesBtn.disabled = false;
        loadFilesBtn.classList.remove("disabled");

        generateBtn.disabled = false;
        generateBtn.classList.remove("disabled");
        updateBtn.disabled = true;
        updateBtn.classList.add("disabled");
      }
    });
  });

/* ===================================
   clasificacion en nueva ventana
=================================== */

document.getElementById("SeeBtn").addEventListener("click", () => {
  if (!window._newData || !window._newHeaders || selectedCols.length === 0) {
    alert("Primero genera la clasificación para poder verla.");
    return;
  }

  const highlightDriver = window._highlightDriver || "";
  const sizeInput = document.getElementById("size")?.value.trim() || null;
  const userSize = parseInt(sizeInput);
  const totalItems = (isNaN(userSize) || userSize <= 0) ? window._newData.length : Math.min(userSize, window._newData.length);
  let currentPage = 1;
  const totalPages = Math.ceil(totalItems / 20);

  function getValueFromRow(row, headers, possibleKeys) {
    for (const key of possibleKeys) {
      const idx = headers.indexOf(key.toLowerCase());
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== "") {
        return row[idx];
      }
    }
    return "";
  }

  // Adaptación de buildTable para ventana nueva, paginada
  function buildTableNewWindow(data, headers, selectedCols, highlightDriver, page, size) {
    const totalToShow = isNaN(parseInt(size)) || parseInt(size) <= 0 ? data.length : Math.min(parseInt(size), data.length);
    const startIdx = (page - 1) * 20;
    const endIdx = Math.min(page * 20, totalToShow);
    const rows = data.slice(startIdx, endIdx);

    let oldPositionsMap = {};
    if (window._oldData && window._oldHeaders) {
      const posIdxOld = window._oldHeaders.indexOf("position");
      const nameIdxOld = window._oldHeaders.indexOf("name");
      window._oldData.forEach(row => {
        const name = row[nameIdxOld];
        const pos = parseInt(row[posIdxOld]);
        oldPositionsMap[name] = pos;
      });
    }

    const table = document.createElement("table");
    table.classList.add("classification-table");

    // Build header
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    selectedCols.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col.text;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Build body
    const tbody = document.createElement("tbody");
    const posIdxNew = headers.indexOf("position");
    const nameIdxNew = headers.indexOf("name");

    rows.forEach(row => {
      const tr = document.createElement("tr");

      const pos = parseInt(row[posIdxNew]);
      const name = row[nameIdxNew];

      if (pos === 1) tr.classList.add("pos-gold");
      else if (pos === 2) tr.classList.add("pos-silver");
      else if (pos === 3) tr.classList.add("pos-bronze");

      if (name === highlightDriver) tr.classList.add("highlight-driver");

      selectedCols.forEach(col => {
        const idx = headers.indexOf(col.value);
        let val = row[idx];
        if (!isNaN(val) && val !== "") val = parseInt(val);

        if (col.text === "País" && val) {
          val = `<img src="https://flagcdn.com/h20/${val.toLowerCase()}.png" width="21" height="14" alt="Bandera">`;
        }

        const td = document.createElement("td");

        if (col.value === "position") {
          const oldPos = oldPositionsMap[name];
          if (oldPos !== undefined) {
            const diff = oldPos - pos;
            if (diff > 0) {
              td.innerHTML = `${pos} <span class="pos-up">▲${diff}</span>`;
            } else if (diff < 0) {
              td.innerHTML = `${pos} <span class="pos-down">▼${Math.abs(diff)}</span>`;
            } else {
              td.innerHTML = `${pos} <span class="pos-same">➖</span>`;
            }
          } else {
            td.innerHTML = `${pos} <span class="pos-new">🆕</span>`;
          }
        } else {
          td.innerHTML = (val === "" || val === undefined) ? "0" : val;
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
  }

  // Función para renderizar paginación en ventana nueva
  function renderPaginationNewWindow(container, page, totalPages) {
    container.innerHTML = "";

    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀️";
    prevBtn.disabled = page === 1;
    prevBtn.style.marginRight = "10px";

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "▶️";
    nextBtn.disabled = page === totalPages;

    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.style.margin = "0 10px";
    pageInfo.style.userSelect = "none";

    container.appendChild(prevBtn);
    container.appendChild(pageInfo);
    container.appendChild(nextBtn);

    return { prevBtn, nextBtn };
  }

  const newWin = window.open("", "_blank", "width=1000,height=700,scrollbars=yes,resizable=yes");
  if (!newWin) {
    alert("Por favor, permite ventanas emergentes para este sitio.");
    return;
  }

  newWin.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Clasificación Nueva</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background: #fff;
          color: #222;
          margin: 20px;
        }
        h2.championship-title {
          text-align: center;
          color: #D32F2F;
          font-size: 24px;
          font-weight: 700;
          margin: 15px 0 10px 0;
          user-select: none;
        }
        .classification-table {
          border-collapse: collapse;
          width: 100%;
          font-size: 14px;
          text-align: center;
          border: 3px solid #000;
          margin-bottom: 20px;
        }
        .classification-table thead {
          background-color: #222;
          color: white;
        }
        .classification-table th,
        .classification-table td {
          padding: 8px 10px;
          border: 2px solid #000;
          min-width: 100px;
          word-wrap: break-word;
        }
        .classification-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .classification-table tbody tr:hover {
          background-color: #f1f1f1;
        }
        .pos-gold { background: #FFD700 !important; }
        .pos-silver { background: #C0C0C0 !important; }
        .pos-bronze { background: #CD7F32 !important; }
        .highlight-driver {
          background: #1976D2 !important;
          color: white !important;
          border-top: 3px solid #000 !important;
          border-bottom: 3px solid #000 !important;
        }
        .pos-up { color: #00c853; font-weight: bold; margin-left: 6px; user-select: none; }
        .pos-down { color: #d50000; font-weight: bold; margin-left: 6px; user-select: none; }
        .pos-same { color: #888; margin-left: 6px; user-select: none; }
        .pos-new { color: #00c853; font-weight: bold; margin-left: 6px; user-select: none; }
        .legend-movements {
          font-size: 13px;
          color: #555;
          margin-top: 10px;
          user-select: none;
        }
        .legend-update-text {
          font-weight: 600;
          color: #222;
          white-space: nowrap;
          margin-left: 10px;
          display: inline-block;
        }
        .exits-list {
          margin-top: 15px;
          border: 2px solid #D32F2F;
          background-color: #fff0f0;
          padding: 10px;
          border-radius: 8px;
          font-size: 14px;
          color: #222;
        }
        .exit-count {
          color: #D32F2F;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .driver-exit {
          margin-bottom: 6px;
          font-size: 14px;
          color: #222;
        }
        .driver-exit img {
          vertical-align: middle;
          margin-right: 6px;
          border: 1px solid #ccc;
          border-radius: 3px;
          object-fit: cover;
          width: 21px;
          height: 14px;
        }
        #pagination-container {
          margin-top: 20px;
          text-align: center;
        }
        #pagination-container button {
          cursor: pointer;
          padding: 6px 12px;
          font-size: 14px;
          margin: 0 5px;
          border-radius: 6px;
          border: 1px solid #999;
          background: #f0f0f0;
          transition: background-color 0.3s ease;
        }
        #pagination-container button:disabled {
          background: #ccc;
          cursor: not-allowed;
          border-color: #bbb;
        }
        #pagination-container button:hover:not(:disabled) {
          background: #ddd;
        }
      </style>
    </head>
    <body>
      <h2 class="championship-title">${document.getElementById("className")?.value.trim() || ""}</h2>
      <div id="classification-container"></div>
      <div id="pagination-container"></div>
    </body>
    </html>
  `);

  newWin.document.close();

  const container = newWin.document.getElementById("classification-container");
  const paginationContainer = newWin.document.getElementById("pagination-container");

  function renderPage(page) {
    container.innerHTML = "";
    container.appendChild(buildTableNewWindow(window._newData, window._newHeaders, selectedCols, highlightDriver, page, sizeInput));

    // Pilotos que salieron si está seleccionado
    if (document.getElementById("show-exits")?.checked) {
      const oldTop20 = window._oldData.slice(0, 20).map(row => getValueFromRow(row, window._oldHeaders, ["name"]));
      const newTop20 = window._newData.slice(0, 20).map(row => getValueFromRow(row, window._newHeaders, ["name"]));
      const exitedDrivers = oldTop20.filter(name => !newTop20.includes(name));

      if (exitedDrivers.length > 0) {
        const exitContainer = newWin.document.createElement("div");
        exitContainer.classList.add("exits-list");

        const exitCountDiv = newWin.document.createElement("div");
        exitCountDiv.classList.add("exit-count");
        exitCountDiv.textContent = `❌ Salieron ${exitedDrivers.length} piloto(s) del Top 20`;
        exitContainer.appendChild(exitCountDiv);

        exitedDrivers.forEach(name => {
          const driverRow = window._oldData.find(row => getValueFromRow(row, window._oldHeaders, ["name"]) === name);
          if (!driverRow) return;

          const countryCodeRaw = getValueFromRow(driverRow, window._oldHeaders, ["country", "país"]);
          const pointsRaw = getValueFromRow(driverRow, window._oldHeaders, ["points", "puntos"]);

          const driverDiv = newWin.document.createElement("div");
          driverDiv.classList.add("driver-exit");

          driverDiv.innerHTML = `
            ${countryCodeRaw ? `<img src="https://flagcdn.com/h20/${countryCodeRaw.toLowerCase()}.png" width="21" height="14" alt="Bandera">` : ""}
            <strong>${name}</strong> - ${pointsRaw && !isNaN(pointsRaw) ? Number(pointsRaw).toLocaleString('es-ES') : pointsRaw} puntos
          `;
          exitContainer.appendChild(driverDiv);
        });

        container.appendChild(exitContainer);
      }
    }

    // Leyenda movimientos si está seleccionado
    if (document.getElementById("show-legend")?.checked) {
      const legendDiv = newWin.document.createElement("div");
      legendDiv.classList.add("legend-movements");

      const raceNumber = document.getElementById("raceNumber")?.value;
      const totalRaces = document.getElementById("totalRaces")?.value;
      let updateText = "";

      if (raceNumber && totalRaces) {
        updateText = `<div class="legend-update-text">
          <strong>Actualizado a ${raceNumber}/${totalRaces} carreras</strong>
        </div>`;
      }

      legendDiv.innerHTML = `
        <strong>🔎 Leyenda de movimientos:</strong><br>
        <span class="pos-up">▲X</span> = Sube X posiciones<br>
        <span class="pos-down">▼-X</span> = Baja X posiciones<br>
        <span class="pos-same">➖</span> = Mantiene posición<br>
        <span class="pos-new">🆕</span> = Nueva entrada al Top 20
        ${updateText}
      `;
      container.appendChild(legendDiv);
    }
  }

  function setupPagination() {
    paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;

    const { prevBtn, nextBtn } = renderPaginationNewWindow(paginationContainer, currentPage, totalPages);

    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        renderPaginationNewWindow(paginationContainer, currentPage, totalPages);
      }
    };

    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
        renderPaginationNewWindow(paginationContainer, currentPage, totalPages);
      }
    };
  }

  renderPage(currentPage);
  setupPagination();
});



});
