const FIREBASE_CURRENT = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";
const FIREBASE_HISTORY = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/history.json";

const map = L.map("map").setView([27.7,85.3],13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let heatLayer = null;
let localHistory = [];

const mapTypeSelect = document.getElementById("mapType");

function getColor(type,val){
  if(type==="mq") return val<50?"green":val<100?"yellow":val<150?"orange":"red";
  if(type==="temp") return val<20?"blue":val<30?"orange":"red";
  if(type==="hum") return val<40?"blue":val<70?"green":"orange";
}

function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

function generateHeatmap(){
  if(localHistory.length<2) return;
  if(heatLayer) map.removeLayer(heatLayer);

  const type = mapTypeSelect.value;
  const maxVal = type==="mq"?200:type==="temp"?50:100;

  const points = localHistory.map(h=>{
    let val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    return [h.lat,h.lon,val/maxVal];
  });

  heatLayer = L.heatLayer(points,{radius:30,blur:20,maxZoom:17}).addTo(map);
}

function updateLastReadings(){
  const listDiv = document.getElementById("readingsList");
  listDiv.innerHTML = "";
  const type = mapTypeSelect.value;
  localHistory.slice().reverse().forEach(r=>{
    const val = type==="mq"?r.mq:type==="temp"?r.temp:r.hum;
    const color = getColor(type,val);
    const card = document.createElement("div");
    card.classList.add("reading-card");
    card.style.border=`2px solid ${color}`;
    card.innerHTML=`
      <p><b>${type==="mq"?"AQI":type==="temp"?"Temp":"Hum"}</b></p>
      <p style="color:${color}">${val}</p>
      <p>${new Date(r.timestamp).toLocaleTimeString()}</p>
    `;
    listDiv.appendChild(card);
  });
}

function updateDynamicLegend(){
  const legendDiv = document.getElementById("readingsLegend");
  legendDiv.innerHTML = "";
  const type = mapTypeSelect.value;
  let items=[];
  if(type==="mq") items=[{c:"green",l:"Healthy"},{c:"yellow",l:"Moderate"},{c:"orange",l:"Unhealthy"},{c:"red",l:"Hazardous"}];
  else if(type==="temp") items=[{c:"blue",l:"Cold"},{c:"orange",l:"Warm"},{c:"red",l:"Hot"}];
  else if(type==="hum") items=[{c:"blue",l:"Low"},{c:"green",l:"Comfort"},{c:"orange",l:"High"}];
  items.forEach(i=>{
    const box=document.createElement("div");
    box.style.display="flex";
    box.style.alignItems="center";
    box.style.marginRight="12px";
    const color=document.createElement("span");
    color.style.background=i.c;
    color.style.width="18px";
    color.style.height="18px";
    color.style.borderRadius="4px";
    color.style.marginRight="6px";
    const label=document.createElement("span");
    label.innerText=i.l;
    box.appendChild(color);
    box.appendChild(label);
    legendDiv.appendChild(box);
  });
}

// fetch history for heatmap
async function fetchHistory(){
  try{
    const res = await axios.get(FIREBASE_HISTORY);
    const data = res.data;
    if(!data) return;

    localHistory = Object.values(data); // convert {key:reading} → array
    generateHeatmap();
    updateLastReadings();
    updateDynamicLegend();

  }catch(e){console.log("Firebase history error:",e);}
}

// fetch current reading for cards
async function fetchCurrent(){
  try{
    const res = await axios.get(FIREBASE_CURRENT);
    const d = res.data;
    if(!d) return;
    document.getElementById("mq").innerText = d.mq ?? "--";
    document.getElementById("temp").innerText = d.temp+" °C";
    document.getElementById("hum").innerText = d.hum+" %";
    document.getElementById("status").innerText = d.status ?? "--";
    document.getElementById("healthAdvice").innerText = d.status ?? "--";

    const type = mapTypeSelect.value;
    const val = type==="mq"?d.mq:type==="temp"?d.temp:d.hum;
    const color = getColor(type,val);
    if(deviceMarker) map.removeLayer(deviceMarker);
    deviceMarker = L.circleMarker([d.lat,d.lon],{radius:12,color:color,fillColor:color,fillOpacity:0.8}).addTo(map);
    deviceMarker.bindPopup(`<b>AQI:</b>${d.mq}<br><b>Temp:</b>${d.temp} °C<br><b>Hum:</b>${d.hum}%<br><b>Status:</b>${d.status}<br><b>Time:</b>${new Date(d.timestamp).toLocaleString()}`);

  }catch(e){console.log("Firebase current error:",e);}
}

mapTypeSelect.addEventListener("change",()=>{
  generateHeatmap();
  updateLastReadings();
  updateDynamicLegend();
});

// Initial fetch
fetchHistory();
fetchCurrent();
setInterval(()=>{fetchCurrent(); fetchHistory();},5000);
updateDynamicLegend();
