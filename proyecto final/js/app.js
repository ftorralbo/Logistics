let paquetesEsperados={}
let registroCarga={}
let erroresPedido={}
let fechasPedido={}
let destinosPedido={}

if(localStorage.getItem("registroCarga"))
    registroCarga=JSON.parse(localStorage.getItem("registroCarga"))

/* IMPORTAR CSV */
function importar(){
    let file=document.getElementById("fileInput").files[0]
    if(!file){ alert("Selecciona un archivo CSV"); return }

    let reader=new FileReader()
    reader.onload=function(e){
        let texto=e.target.result
        let lineas=texto.split(/\r?\n/)

        paquetesEsperados={}
        fechasPedido={}
        destinosPedido={}

        for(let i=1;i<lineas.length;i++){
            if(!lineas[i]) continue

            let d=lineas[i].includes(";") ? lineas[i].split(";") : lineas[i].split(",")

            let paquete=(d[0]||"").trim()
            if(!paquete) continue

            let destino=(d[1]||"").trim()
            let pedido=(d[2]||"").trim()
            let fecha=d[3]?d[3].trim():""
            let numero=d[4]?d[4].trim():""

            paquetesEsperados[paquete]={destino,pedido,fecha,numero}

            if(pedido && !fechasPedido[pedido]) fechasPedido[pedido]=fecha
            if(pedido && !destinosPedido[pedido]) destinosPedido[pedido]=destino
        }

        mostrarPedidos()
        rellenarFiltros()
        alert("Importado correctamente")
    }
    reader.readAsText(file)
}

/* MOSTRAR PEDIDOS */
function mostrarPedidos(){
    let cont=document.getElementById("pedidos")
    cont.innerHTML=""

    let pedidos={}

    for(let p in paquetesEsperados){
        let pedido=paquetesEsperados[p].pedido
        if(!pedido) continue
        if(!pedidos[pedido]) pedidos[pedido]=0
        pedidos[pedido]++
    }

    for(let pedido in pedidos){
        let total=pedidos[pedido]
        let cargados=registroCarga[pedido]?Object.keys(registroCarga[pedido]).length:0

        let div=document.createElement("div")
        div.className="pedido"
        div.innerHTML=`Pedido ${pedido} | Destino: ${destinosPedido[pedido]||"-"} | Salida: ${fechasPedido[pedido]||"-"} — ${cargados}/${total}`
        div.onclick=function(){ abrirPedido(pedido,total) }
        cont.appendChild(div)
    }

    mostrarRadar()
}

/* RADAR */
function mostrarRadar(){
    let radar=document.getElementById("radar")
    radar.innerHTML=""

    let pedidos={}

    for(let p in paquetesEsperados){
        let pedido=paquetesEsperados[p].pedido
        if(!pedido) continue
        if(!pedidos[pedido]) pedidos[pedido]=0
        pedidos[pedido]++
    }

    for(let pedido in pedidos){
        let total=pedidos[pedido]
        let cargados=registroCarga[pedido]?Object.keys(registroCarga[pedido]).length:0
        let porcentaje=Math.round((cargados/total)*100)

        let color="amarillo"
        if(porcentaje==100) color="verde"
        if(erroresPedido[pedido]) color="rojo"

        let item=document.createElement("div")
        item.className="radarItem"
        item.innerHTML=`
            <b>${pedido}</b> | ${destinosPedido[pedido]||"-"}
            <br>Salida: ${fechasPedido[pedido]||"-"}
            <br>${cargados}/${total} (${porcentaje}%)
            <div class="barra">
                <div class="barraInterna ${color}" style="width:${porcentaje}%"></div>
            </div>
        `
        radar.appendChild(item)
    }
}

/* ABRIR PEDIDO */
function abrirPedido(pedido,total){
    let div=document.getElementById("pantallaPedido")
    div.innerHTML=`
        <h2>PEDIDO ${pedido}</h2>
        <h3>Destino: ${destinosPedido[pedido]||"-"}</h3>
        <h3>Salida: ${fechasPedido[pedido]||"-"}</h3>

        <input id="inputPaquete" placeholder="Escanear paquete" style="width:300px;padding:10px;font-size:18px">

        <button onclick="registrarPaquete('${pedido}',${total})">REGISTRAR</button>
        <button class="escanear" onclick="iniciarEscaner('${pedido}',${total})">ESCANEAR</button>

        <div id="estado"></div>

        <video id="video"></video>

        <h3>Paquetes cargados</h3>
        <div id="listaCargados" class="lista"></div>

        <h3>Paquetes pendientes</h3>
        <div id="listaPendientes" class="lista"></div>
    `
    actualizarListasPedido(pedido)
}

/* ACTUALIZAR LISTAS */
function actualizarListasPedido(pedido){
    let cargadosDiv=document.getElementById("listaCargados")
    let pendientesDiv=document.getElementById("listaPendientes")

    cargadosDiv.innerHTML=""
    pendientesDiv.innerHTML=""

    let cargados=registroCarga[pedido]?Object.keys(registroCarga[pedido]):[]

    for(let paquete in paquetesEsperados){
        let info=paquetesEsperados[paquete]
        if(info.pedido!=pedido) continue

        let numero=info.numero||"-"
        let esCargado=cargados.includes(paquete)

        if(esCargado){
            cargadosDiv.innerHTML+=`
                <div class="radarItem">
                    <b>${paquete}</b> — Nº ${numero}
                    <br><span class="small">${registroCarga[pedido][paquete]}</span>
                </div>
            `
        } else {
            pendientesDiv.innerHTML+=`
                <div class="radarItem">
                    <b>${paquete}</b> — Nº ${numero}
                </div>
            `
        }
    }
}

/* REGISTRAR PAQUETE */
function registrarPaquete(pedido,total){
    let input=document.getElementById("inputPaquete")
    let paquete=input.value.trim()
    let estado=document.getElementById("estado")

    if(!paquete){
        estado.className="error"
        estado.innerHTML="INTRODUCE UN CÓDIGO"
        return
    }

    if(!paquetesEsperados[paquete]){
        estado.className="error"
        estado.innerHTML="PAQUETE NO EXISTE"
        return
    }

    if(paquetesEsperados[paquete].pedido!=pedido){
        estado.className="error"
        estado.innerHTML="ERROR PEDIDO"
        erroresPedido[pedido]=true
        mostrarRadar()
        return
    }

    if(!registroCarga[pedido]) registroCarga[pedido]={}

    if(registroCarga[pedido][paquete]){
        estado.className="duplicado"
        estado.innerHTML="YA ESCANEADO"
        return
    }

    registroCarga[pedido][paquete]=new Date().toISOString()
    localStorage.setItem("registroCarga",JSON.stringify(registroCarga))

    estado.className="correcto"
    estado.innerHTML="CORRECTO"

    input.value=""

    mostrarPedidos()
    actualizarListasPedido(pedido)
}

/* ESCÁNER */
function iniciarEscaner(pedido,total){
    const codeReader=new ZXing.BrowserBarcodeReader()
    codeReader.decodeFromVideoDevice(null,'video',(result,err)=>{
        if(result){
            let input=document.getElementById("inputPaquete")
            input.value=result.text
            registrarPaquete(pedido,total)
        }
    })
}

/* EXPORTAR CSV */
function exportar(){
    let csv="fecha,pedido,paquete\n"
    for(let pedido in registroCarga){
        for(let paquete in registroCarga[pedido]){
            csv+=registroCarga[pedido][paquete]+","+pedido+","+paquete+"\n"
        }
    }
    let blob=new Blob([csv],{type:"text/csv"})
    let url=URL.createObjectURL(blob)
    let a=document.createElement("a")
    a.href=url
    a.download="historico_carga.csv"
    a.click()
}

/* RESTAURAR HISTÓRICO */
function restaurar(){
    let file=document.getElementById("fileBackup").files[0]
    if(!file){ alert("Selecciona archivo"); return }

    let reader=new FileReader()
    reader.onload=function(e){
        let texto=e.target.result
        let lineas=texto.split(/\r?\n/)

        for(let i=1;i<lineas.length;i++){
            if(!lineas[i]) continue
            let d=lineas[i].split(",")
            let fecha=d[0]
            let pedido=d[1]
            let paquete=d[2]
            if(!registroCarga[pedido]) registroCarga[pedido]={}
            registroCarga[pedido][paquete]=fecha
        }

        localStorage.setItem("registroCarga",JSON.stringify(registroCarga))
        mostrarPedidos()
        alert("Histórico restaurado correctamente")
    }
    reader.readAsText(file)
}

/* MODAL LATERAL */
function abrirModal(){
    const overlay=document.getElementById("modalOverlay")
    const panel=document.getElementById("modalPanel")
    overlay.style.display="flex"
    setTimeout(()=>panel.classList.add("open"),10)
}

function cerrarModal(){
    const overlay=document.getElementById("modalOverlay")
    const panel=document.getElementById("modalPanel")
    panel.classList.remove("open")
    setTimeout(()=>overlay.style.display="none",300)
}

document.getElementById("cerrarModal").onclick=()=>cerrarModal()
document.getElementById("modalOverlay").onclick=e=>{
    if(e.target.id==="modalOverlay") cerrarModal()
}

/* RELLENAR FILTROS */
function rellenarFiltros(){
    let selDestino=document.getElementById("filtroDestino")
    let selFecha=document.getElementById("filtroFecha")
    let selPedido=document.getElementById("filtroPedido")
    let selNumero=document.getElementById("filtroNumero")

    selDestino.innerHTML='<option value="">Todos</option>'
    selFecha.innerHTML='<option value="">Todas</option>'
    selPedido.innerHTML='<option value="">Todos</option>'
    selNumero.innerHTML='<option value="">Todos</option>'

    for(let i=1;i<=33;i++){
        let opt=document.createElement("option")
        opt.value=String(i)
        opt.textContent=i
        selNumero.appendChild(opt)
    }

    let destinosSet=new Set()
    let fechasSet=new Set()
    let pedidosSet=new Set()

    for(let paquete in paquetesEsperados){
        let info=paquetesEsperados[paquete]
        if(info.destino) destinosSet.add(info.destino)
        if(info.fecha) fechasSet.add(info.fecha)
        if(info.pedido) pedidosSet.add(info.pedido)
    }

    Array.from(destinosSet).sort().forEach(d=>{
        let opt=document.createElement("option")
        opt.value=d
        opt.textContent=d
        selDestino.appendChild(opt)
    })

    Array.from(fechasSet).sort().forEach(f=>{
        let opt=document.createElement("option")
        opt.value=f
        opt.textContent=f
        selFecha.appendChild(opt)
    })

    Array.from(pedidosSet).sort().forEach(p=>{
        let opt=document.createElement("option")
        opt.value=p
        opt.textContent=p
        selPedido.appendChild(opt)
    })
}

function resetFiltrosExcept(tipo){
    let busq=document.getElementById("busquedaPaquete")
    let fEstado=document.getElementById("filtroEstado")
    let fNumero=document.getElementById("filtroNumero")
    let fDestino=document.getElementById("filtroDestino")
    let fFecha=document.getElementById("filtroFecha")
    let fPedido=document.getElementById("filtroPedido")

    if(tipo!=="paquete") busq.value=""
    if(tipo!=="estado") fEstado.value=""
    if(tipo!=="numero") fNumero.value=""
    if(tipo!=="destino") fDestino.value=""
    if(tipo!=="fecha") fFecha.value=""
    if(tipo!=="pedido") fPedido.value=""
}

function aplicarFiltro(tipo,valor){
    let lista=document.getElementById("listaResultados")
    lista.innerHTML=""

    if(!valor){
        cerrarModal()
        return
    }

    let resultados=[]

    for(let paquete in paquetesEsperados){
        let info=paquetesEsperados[paquete]
        let pedido=info.pedido
        let destino=info.destino
        let fecha=info.fecha
        let numero=info.numero || "-"
        let estado=(registroCarga[pedido] && registroCarga[pedido][paquete]) ? "cargado" : "pendiente"

        let coincide=false

        switch(tipo){
            case "paquete":
                if(paquete.toLowerCase().includes(valor.toLowerCase())) coincide=true
                break
            case "estado":
                if(estado===valor) coincide=true
                break
            case "numero":
                if(info.numero===valor) coincide=true
                break
            case "destino":
                if(destino===valor) coincide=true
                break
            case "fecha":
                if(fecha===valor) coincide=true
                break
            case "pedido":
                if(pedido===valor) coincide=true
                break
        }

        if(coincide){
            resultados.push({
                paquete,
                pedido,
                destino,
                fecha,
                numero,
                estado,
                fechaCarga: registroCarga[pedido]?registroCarga[pedido][paquete]:""
            })
        }
    }

    if(resultados.length===0){
        lista.innerHTML="<div class='small'>Sin resultados.</div>"
        abrirModal()
        return
    }

    resultados.forEach(r=>{
        lista.innerHTML+=`
            <div class="radarItem">
                <b>${r.paquete}</b> — Nº ${r.numero}
                <br>Pedido: ${r.pedido || "-"} | Destino: ${r.destino || "-"} | Salida: ${r.fecha || "-"}
                <br>Estado: ${r.estado.toUpperCase()}${r.fechaCarga ? " — <span class='small'>"+r.fechaCarga+"</span>" : ""}
            </div>
        `
    })

    abrirModal()
}

/* EVENTOS FILTROS */
window.addEventListener("DOMContentLoaded",()=>{
    rellenarFiltros()

    let busq=document.getElementById("busquedaPaquete")
    let fEstado=document.getElementById("filtroEstado")
    let fNumero=document.getElementById("filtroNumero")
    let fDestino=document.getElementById("filtroDestino")
    let fFecha=document.getElementById("filtroFecha")
    let fPedido=document.getElementById("filtroPedido")

    busq.addEventListener("input",e=>{
        resetFiltrosExcept("paquete")
        aplicarFiltro("paquete",e.target.value.trim())
    })

    fEstado.addEventListener("change",e=>{
        resetFiltrosExcept("estado")
        aplicarFiltro("estado",e.target.value)
    })

    fNumero.addEventListener("change",e=>{
        resetFiltrosExcept("numero")
        aplicarFiltro("numero",e.target.value)
    })

    fDestino.addEventListener("change",e=>{
        resetFiltrosExcept("destino")
        aplicarFiltro("destino",e.target.value)
    })

    fFecha.addEventListener("change",e=>{
        resetFiltrosExcept("fecha")
        aplicarFiltro("fecha",e.target.value)
    })

    fPedido.addEventListener("change",e=>{
        resetFiltrosExcept("pedido")
        aplicarFiltro("pedido",e.target.value)
    })
})