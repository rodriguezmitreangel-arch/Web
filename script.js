document.addEventListener("DOMContentLoaded", () => {
  const botones = document.querySelectorAll(".menu-btn");
  const paginas = document.querySelectorAll(".pagina");
  const charts = {};
  let dataset = [];

  // ======= CAMBIO DE SECCIONES =======
  botones.forEach(boton => {
    boton.addEventListener("click", () => {
      const destino = boton.getAttribute("data-target");
      botones.forEach(b => b.classList.remove("activa"));
      paginas.forEach(p => p.classList.remove("activa"));
      boton.classList.add("activa");
      document.getElementById(destino).classList.add("activa");
      if (dataset.length > 0) actualizarGraficas(destino);
    });
  });

  // ======= GENERAR DATOS =======
  document.getElementById("generarDatosBtn").addEventListener("click", () => {
    dataset = generarDatos(3, 12);
    mostrarTabla(dataset);
    graficarPuntos("graficaGenerados", dataset, "Valores por grupo");
    alert("Conjunto de datos generado. Ahora puedes explorar las secciones.");
  });

  function generarDatos(numGrupos, n) {
    const data = [];
    const medias = [20, 26, 31];
    const desviacion = 3;
    for (let g = 0; g < numGrupos; g++) {
      for (let i = 0; i < n; i++) {
        const valor = +(medias[g] + randomNormal() * desviacion).toFixed(2);
        data.push({ grupo: `G${g + 1}`, valor });
      }
    }
    return data;
  }
  function randomNormal() {
    return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
  }

  function mostrarTabla(data) {
    let html = "<table><thead><tr><th>Grupo</th><th>Valor</th></tr></thead><tbody>";
    data.forEach(d => html += `<tr><td>${d.grupo}</td><td>${d.valor}</td></tr>`);
    html += "</tbody></table>";
    document.getElementById("tablaDatos").innerHTML = html;
  }

  // ======= GRAFICAR DATOS REALES =======
  function graficarPuntos(idCanvas, data, titulo) {
    const ctx = document.getElementById(idCanvas).getContext("2d");
    const grupos = [...new Set(data.map(d => d.grupo))];
    const colores = ["#00ffff", "#ff00ff", "#00ff88"];
    const datasets = grupos.map((g, i) => ({
      label: g,
      data: data.filter(d => d.grupo === g).map((d, idx) => ({ x: idx + 1, y: d.valor })),
      borderColor: colores[i],
      backgroundColor: colores[i] + "88",
      pointRadius: 5,
      showLine: false
    }));
    if (charts[idCanvas]) charts[idCanvas].destroy();
    charts[idCanvas] = new Chart(ctx, {
      type: "scatter",
      data: { datasets },
      options: {
        plugins: { title: { display: true, text: titulo, color: "#00ffff" } },
        scales: {
          x: { title: { display: true, text: "Muestra", color: "#00eaff" } },
          y: { title: { display: true, text: "Valor", color: "#00eaff" }, beginAtZero: false }
        }
      }
    });
  }

  // ======= ACTUALIZAR SECCIONES =======
  function actualizarGraficas(destino) {
    if (destino === "ANOVA") {
      const res = calcularAnova(dataset);
      document.getElementById("anovaResultado").innerHTML = `
        <p><strong>F:</strong> ${res.F.toFixed(3)} | <strong>SSB:</strong> ${res.SSB.toFixed(2)} | <strong>SSW:</strong> ${res.SSW.toFixed(2)}</p>
        <p><strong>Conclusión:</strong> ${res.F > 3.1 ? "Se rechaza H₀ (diferencias significativas)" : "No se rechaza H₀"}</p>`;
      graficarPuntos("graficaAnova", dataset, "Distribución real de valores (ANOVA)");
    }

    if (destino === "XI_CUADRADO") {
      const grupos = [...new Set(dataset.map(d => d.grupo))];
      const conteos = grupos.map(g => dataset.filter(d => d.grupo === g).length);
      const esperado = dataset.length / grupos.length;
      const chi2 = conteos.reduce((s, o) => s + Math.pow(o - esperado, 2) / esperado, 0);
      document.getElementById("chiResultado").innerHTML = `<p><strong>χ² calculado:</strong> ${chi2.toFixed(3)}</p>`;
      graficarBarras("graficaChi", grupos, conteos, "Frecuencias observadas");
    }

    if (destino === "COMPONENTES_PRINCIPALES") {
      const coords = calcularPCA(dataset);
      graficarDispersión("graficaPCA", coords, "Proyección PCA (2 componentes)");
      document.getElementById("pcaResultado").innerHTML = `<p>Visualización PCA.</p>`;
    }

    if (destino === "COEFICIENTES_RELACION") {
      const r = calcularCorrelacion(dataset);
      document.getElementById("corrResultado").innerHTML = `<p><strong>r:</strong> ${r.toFixed(3)}</p>`;
      graficarDispersión("graficaCorr",
        dataset.map(d => ({ x: parseInt(d.grupo.replace("G","")), y: d.valor })),
        "Correlación entre grupo y valor");
    }
  }

  // ======= FUNCIONES ESTADÍSTICAS =======
  function calcularAnova(data) {
    const grupos = [...new Set(data.map(d => d.grupo))];
    const vals = grupos.map(g => data.filter(d => d.grupo === g).map(d => d.valor));
    const medias = vals.map(v => v.reduce((a,b)=>a+b)/v.length);
    const mediaGlobal = data.reduce((a,b)=>a+b.valor,0)/data.length;
    let SSB=0,SSW=0;
    for (let i=0;i<grupos.length;i++){
      SSB += vals[i].length*Math.pow(medias[i]-mediaGlobal,2);
      vals[i].forEach(v=>SSW+=Math.pow(v-medias[i],2));
    }
    const F=(SSB/(grupos.length-1))/(SSW/(data.length-grupos.length));
    return {SSB,SSW,F};
  }

  function calcularPCA(data){
    // PCA muy simplificada: 2 componentes derivadas
    const valores = data.map(d=>d.valor);
    const media = valores.reduce((a,b)=>a+b)/valores.length;
    const comps = valores.map((v,i)=>({x:i, y:v-media}));
    return comps;
  }

  function calcularCorrelacion(data){
    const x = data.map(d=>parseInt(d.grupo.replace("G","")));
    const y = data.map(d=>d.valor);
    const meanX = x.reduce((a,b)=>a+b)/x.length;
    const meanY = y.reduce((a,b)=>a+b)/y.length;
    const num = x.map((v,i)=>(v-meanX)*(y[i]-meanY)).reduce((a,b)=>a+b);
    const den = Math.sqrt(x.map(v=>Math.pow(v-meanX,2)).reduce((a,b)=>a+b)*y.map(v=>Math.pow(v-meanY,2)).reduce((a,b)=>a+b));
    return num/den;
  }

  // ======= GRÁFICAS AUXILIARES =======
  function graficarBarras(id, etiquetas, valores, titulo){
    const ctx=document.getElementById(id).getContext("2d");
    if (charts[id]) charts[id].destroy();
    charts[id]=new Chart(ctx,{
      type:"bar",
      data:{labels:etiquetas,datasets:[{label:"Frecuencia",data:valores,backgroundColor:"#00eaff88",borderColor:"#00ffff",borderWidth:2}]},
      options:{plugins:{title:{display:true,text:titulo,color:"#00ffff"}},scales:{y:{beginAtZero:true}}}
    });
  }

  function graficarDispersión(id,data,titulo){
    const ctx=document.getElementById(id).getContext("2d");
    if(charts[id])charts[id].destroy();
    charts[id]=new Chart(ctx,{
      type:"scatter",
      data:{datasets:[{label:titulo,data,borderColor:"#00ffff",backgroundColor:"#00ffff88"}]},
      options:{plugins:{title:{display:true,text:titulo,color:"#00ffff"}},
      scales:{x:{title:{display:true,text:"X"}},y:{title:{display:true,text:"Y"}}}}
    });
  }
});
