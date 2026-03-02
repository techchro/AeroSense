const FIREBASE_URL = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";

const map = L.map("map").setView([27.7,85.3],13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let heatLayer = null;
let localHistory = []; // 👈 local rolling history (max 30)

const mapTypeSelect = document.getElementById("mapType");

function getColor(type,val){
  if(type==="mq") return val<50?"green":val<100?"yellow":val<150?"orange":"red";
  if(type==="temp") return val<20?"blue":val<30?"orange":"red";
  if(type==="hum") return val<40?"blue":val<70?"green":"orange";
}

function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// 🔥 Heatmap from local history
function generateHeatmap(){
  if(localHistory.length < 2) return; // Need at least 2 points

  if(heatLayer) map.removeLayer(heatLayer);

  const type = mapTypeSelect.value;

  const points = localHistory.map(h=>{
    let val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    return [h.lat,h.lon,val];
  });

  heatLayer = L.heatLayer(points,{
    radius:30,
    blur:20,
    maxZoom:17
  }).addTo(map);
}

// 🔥 Last 30 UI
function updateLastReadings(){
  const listDiv = document.getElementById("readingsList");
  listDiv.innerHTML = "";

  const type = mapTypeSelect.value;

  localHistory.slice().reverse().forEach(r=>{
    const val = type==="mq"?r.mq:type==="temp"?r.temp:r.hum;
    const color = getColor(type,val);

    const card = document.createElement("div");
    card.classList.add("reading-card");
    card.style.border = `2px solid ${color}`;

    card.innerHTML = `
      <p><b>${type==="mq"?"AQI":type==="temp"?"Temp":"Hum"}</b></p>
      <p style="color:${color}">${val}</p>
      <p>${new Date(r.timestamp).toLocaleTimeString()}</p>
    `;
    listDiv.appendChild(card);
  });
}

// 🔥 Dynamic Legend with Labels
function updateDynamicLegend(){
  const legendDiv = document.getElementById("readingsLegend");
  legendDiv.innerHTML = "";

  const type = mapTypeSelect.value;
  let items=[];

  if(type==="mq"){
    items=[
      {c:"green",l:"Healthy"},
      {c:"yellow",l:"Moderate"},
      {c:"orange",l:"Unhealthy"},
      {c:"red",l:"Hazardous"}
    ];
  }
  else if(type==="temp"){
    items=[
      {c:"blue",l:"Cold"},
      {c:"orange",l:"Warm"},
      {c:"red",l:"Hot"}
    ];
  }
  else if(type==="hum"){
    items=[
      {c:"blue",l:"Low"},
      {c:"green",l:"Comfort"},
      {c:"orange",l:"High"}
    ];
  }

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

// 🔥 Fetch current data
async function fetchData(){
  try{
    const res = await axios.get(FIREBASE_URL);
    const d = res.data;
    if(!d) return;

    document.getElementById("mq").innerText = d.mq ?? "--";
    document.getElementById("temp").innerText = d.temp+" °C";
    document.getElementById("hum").innerText = d.hum+" %";
    document.getElementById("status").innerText = d.status ?? "--";
    document.getElementById("healthAdvice").innerText = d.status ?? "--";

    // 👇 Add to local history
    localHistory.push({
      lat:d.lat,
      lon:d.lon,
      mq:d.mq,
      temp:d.temp,
      hum:d.hum,
      timestamp:d.timestamp
    });

    // Keep only last 30
    if(localHistory.length > 30){
      localHistory.shift();
    }

    const type = mapTypeSelect.value;
    const val = type==="mq"?d.mq:type==="temp"?d.temp:d.hum;
    const color = getColor(type,val);

    if(deviceMarker) map.removeLayer(deviceMarker);

    deviceMarker = L.circleMarker([d.lat,d.lon],{
      radius:12,
      color:color,
      fillColor:color,
      fillOpacity:0.8
    }).addTo(map);

    deviceMarker.bindPopup(`
      <b>AQI:</b> ${d.mq}<br>
      <b>Temp:</b> ${d.temp} °C<br>
      <b>Humidity:</b> ${d.hum}%<br>
      <b>Status:</b> ${d.status}<br>
      <b>Time:</b> ${new Date(d.timestamp).toLocaleString()}
    `);

    generateHeatmap();
    updateLastReadings();
    updateDynamicLegend();

  }catch(e){
    console.log("Firebase error:",e);
  }
}

mapTypeSelect.addEventListener("change",()=>{
  generateHeatmap();
  updateLastReadings();
  updateDynamicLegend();
});

setInterval(fetchData,2000);
updateDynamicLegend();
