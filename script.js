// ================== script.js ==================

const FIREBASE_CURRENT = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";
const FIREBASE_HISTORY = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/history.json";

const map = L.map("map").setView([27.55,84.5], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let historyCircles = [];
let localHistory = [];

const mapTypeSelect = document.getElementById("mapType");

// ================= Color scale =================
function getColor(type,val){
  if(type==="mq") return val<50?"#00ff88":val<100?"#ffff66":val<150?"#ff9933":"#ff4d4d";
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
    const opacity = 0.1 + (ageFactor * 0.3);

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
  legendDiv.innerHTML = "";

  const type = mapTypeSelect.value;
  let items=[];

  if(type==="mq"){
    items=[
      {c:"#00ff88",l:"Healthy"},
      {c:"#ffff66",l:"Moderate"},
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

// ================= Fetch History =================
async function fetchHistory(){
  try{
    const res = await axios.get(FIREBASE_HISTORY);
    const data = res.data;
    if(!data) return;

    // Object.values gives all history points
    localHistory = Object.values(data);  // DO NOT slice
    drawHistory();

  }catch(e){
    console.log("History fetch error",e);
  }
}

// ================= Upgraded Draw History (all points) =================
function drawHistory(){

  // Remove old circles
  historyCircles.forEach(c=>map.removeLayer(c));
  historyCircles = [];

  const type = mapTypeSelect.value;
  const totalPoints = localHistory.length;

  localHistory.forEach((h,index)=>{

    if(!h.lat || !h.lon) return;

    const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    const baseColor = getColor(type,val);

    const ageFactor = (index+1)/totalPoints;
    const opacity = 0.09 + (ageFactor * 0.2); // soft blend

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

// ================= Fetch Current =================
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

    localHistory.push({
      lat:d.lat,
      lon:d.lon,
      mq:d.mq,
      temp:d.temp,
      hum:d.hum,
      status:d.status,
      timestamp:d.timestamp
    });

    if(localHistory.length>300) localHistory.shift();

    drawHistory();
    drawDevice(d);

  }catch(e){
    console.log("Current fetch error",e);
  }
}

// ================= Map type change =================
mapTypeSelect.addEventListener("change",()=>{
  drawHistory();
  fetchCurrent();
  updateLegend();
});

// ================= Init =================
updateLegend();
fetchHistory();
fetchCurrent();

setInterval(()=>{
  fetchHistory();
  fetchCurrent();
},3000);

