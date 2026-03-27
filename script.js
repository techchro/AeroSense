// ================== script.js ==================

const FIREBASE_CURRENT = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";
const FIREBASE_HISTORY = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/history.json";

const map = L.map("map-container").setView([27.55,84.5], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let historyCircles = [];

const manualHistory = [
  {location:"Bharatpur", lat:27.6713, lon:85.4122, mq:124, temp:29, hum:68, status:"Moderate", timestamp: Date.now() - 600000},
  {location:"Tandi", lat:27.6195, lon:85.3911, mq:125, temp:30, hum:70, status:"Moderate", timestamp: Date.now() - 540000},
  {location:"Parsa", lat:27.2450, lon:84.8161, mq:120, temp:31, hum:66, status:"Moderate", timestamp: Date.now() - 480000}
];

let localHistory = [...manualHistory];

const mapTypeSelect = document.getElementById("mapType");

// ================= Smooth Scrolling Function =================
function scrollToSection(sectionId){
  const section = document.getElementById(sectionId);
  if(section){
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ================= Color scale =================
function getColor(type,val){
  if(type==="mq") return val<50?"#00ff88":val<100?"#ffff00":val<150?"#ff9933":"#ff4d4d";
  if(type==="temp") return val<20?"#66ccff":val<30?"#ffb84d":"#ff4d4d";
  if(type==="hum") return val<40?"#66ccff":val<70?"#66ff99":"#ffb84d";
}

// ================= Recenter =================
function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// ================= Convert HEX to RGBA =================
function hexToRGBA(hex,alpha){
  const r = parseInt(hex.substring(1,3),16);
  const g = parseInt(hex.substring(3,5),16);
  const b = parseInt(hex.substring(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ================= Upgraded Draw History =================
function drawHistory(){

  historyCircles.forEach(c=>map.removeLayer(c));
  historyCircles = [];

  const type = mapTypeSelect.value;
  const totalPoints = localHistory.length;

  localHistory.forEach((h,index)=>{

    if(!h.lat || !h.lon) return;

    const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    const baseColor = getColor(type,val);

    const ageFactor = (index+1)/totalPoints;
    const opacity = 0.1 + (ageFactor * 0.25);

    const circle = L.circle([h.lat,h.lon],{
      radius: 110,
      fillColor: hexToRGBA(baseColor,opacity),
      fillOpacity: opacity,
      stroke:false
    }).addTo(map);

    circle.bindTooltip(
      `<b>AQI:</b> ${h.mq}<br>
       <b>Temp:</b> ${h.temp} °C<br>
       <b>Hum:</b> ${h.hum}%<br>
       <b>Time:</b> ${new Date(h.timestamp).toLocaleString()}`,
       {direction:"top"}
    );

    historyCircles.push(circle);
  });
}

// ================= Draw Current Device =================
function drawDevice(d){

  const type = mapTypeSelect.value;
  const val = type==="mq"?d.mq:type==="temp"?d.temp:d.hum;
  const color = getColor(type,val);

  if(deviceMarker) map.removeLayer(deviceMarker);

  deviceMarker = L.circleMarker([d.lat,d.lon],{
    radius:14,
    fillColor: color,
    fillOpacity: 0.9,
    stroke:false
  }).addTo(map);

  deviceMarker.bindPopup(
    `<b>AQI:</b> ${d.mq}<br>
     <b>Temp:</b> ${d.temp} °C<br>
     <b>Hum:</b> ${d.hum}%<br>
     <b>Status:</b> ${d.status}<br>
     <b>Time:</b> ${new Date(d.timestamp).toLocaleString()}`
  );
}

// ================= Dynamic Legend =================
function updateLegend(){

  const legendDiv = document.getElementById("readingsLegend");
  if(!legendDiv) return;
  legendDiv.innerHTML = "";

  const type = (mapTypeSelect && mapTypeSelect.value) ? mapTypeSelect.value : "mq";
  let items=[];

  if(type==="mq"){
    items=[
      {c:"#00ff88",l:"Healthy"},
      {c:"#ffff00",l:"Moderate"},
      {c:"#ff9933",l:"Unhealthy"},
      {c:"#ff4d4d",l:"Hazardous"}
    ];
  }else if(type==="temp"){
    items=[
      {c:"#66ccff",l:"Cold"},
      {c:"#ffb84d",l:"Warm"},
      {c:"#ff4d4d",l:"Hot"}
    ];
  }else if(type==="hum"){
    items=[
      {c:"#66ccff",l:"Low"},
      {c:"#66ff99",l:"Comfort"},
      {c:"#ffb84d",l:"High"}
    ];
  }

  items.forEach(i=>{
    const itemDiv = document.createElement("div");
    itemDiv.className = "legend-item";

    const colorDiv = document.createElement("div");
    colorDiv.className = "legend-color";
    colorDiv.style.background = i.c;

    const labelDiv = document.createElement("div");
    labelDiv.className = "legend-label";
    labelDiv.innerText = i.l;

    itemDiv.appendChild(colorDiv);
    itemDiv.appendChild(labelDiv);
    legendDiv.appendChild(itemDiv);
  });
}

// ================= Render Readings List =================
function renderReadingsList(){
  const readingsDiv = document.getElementById("readingsList");
  if(!readingsDiv) return;

  const latest = localHistory.slice(-10).reverse();
  readingsDiv.innerHTML = latest.map(h => `
    <div class="reading-card">
      <p style="font-weight:700; color: var(--text);">${h.location || "Unknown"}</p>
      <p style="margin:4px 0; color: var(--muted);">AQI: <strong>${h.mq ?? "--"}</strong></p>
      <p style="margin:4px 0; color: var(--muted);">Temp: ${h.temp ?? "--"} °C</p>
      <p style="margin:4px 0; color: var(--muted);">Hum: ${h.hum ?? "--"}%</p>
    </div>
  `).join("");
}

// ================= Fetch History (Manual Sample Only) =================
async function fetchHistory(){
  try{
    // Use only local sample entries; do not fetch from Firebase
    localHistory = [...manualHistory];
    drawHistory();
    renderReadingsList();
    updateLegend();
  }catch(e){
    console.log("Manual history update error", e);
  }
}

// ================= Upgraded Draw History (all points) =================
function drawHistory(){

  if(!mapTypeSelect){
    return;
  }

  // Remove old circles
  historyCircles.forEach(c=>map.removeLayer(c));
  historyCircles = [];

  const type = mapTypeSelect.value || "mq";
  const totalPoints = localHistory.length;

  localHistory.forEach((h,index)=>{

    if(!h.lat || !h.lon) return;

    const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    const baseColor = getColor(type,val);

    const ageFactor = (index+1)/totalPoints;
    const opacity = 0.3 + (ageFactor * 0.5); // darker history points

    const circle = L.circle([h.lat,h.lon],{
      radius: 100,
      fillColor: hexToRGBA(baseColor,opacity),
      fillOpacity: opacity,
      stroke:false
    }).addTo(map);

    circle.bindTooltip(
      `<b>AQI:</b> ${h.mq}<br>
       <b>Temp:</b> ${h.temp} °C<br>
       <b>Hum:</b> ${h.hum}%<br>
       <b>Time:</b> ${new Date(h.timestamp).toLocaleString()}`,
       {direction:"top"}
    );

    historyCircles.push(circle);
  });
}

// ================= Fetch Current (Manual Sample Only) =================
async function fetchCurrent(){
  try{
    const d = manualHistory[0] || manualHistory[manualHistory.length - 1] || {location: 'Sample', lat: 27.55, lon: 84.5, mq: 120, temp: 29, hum: 67, status: 'Moderate', timestamp: Date.now()};

    document.getElementById("mq").innerText = d.mq ?? "--";
    document.getElementById("temp").innerText = (d.temp!==undefined ? d.temp : "--") + " °C";
    document.getElementById("hum").innerText = (d.hum!==undefined ? d.hum : "--") + " %";
    document.getElementById("status").innerText = d.status ?? "--";
    document.getElementById("healthAdvice").innerText = d.status ?? "--";

    localHistory = [...manualHistory];

    if(localHistory.length > 300) localHistory = localHistory.slice(-300);

    if(mapTypeSelect){
      drawHistory();
      updateLegend();
    }
    drawDevice(d);
    renderReadingsList();

  }catch(e){
    console.log("Manual current update error",e);
  }
}

// ================= Map type change =================
mapTypeSelect.addEventListener("change",()=>{
  drawHistory();
  fetchCurrent();
  updateLegend();
  renderReadingsList();
});

// ================= Init =================
updateLegend();
renderReadingsList();
fetchHistory();
fetchCurrent();

setInterval(()=>{
  fetchHistory();
  fetchCurrent();
},3000);
