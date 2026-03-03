const FIREBASE_CURRENT = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";
const FIREBASE_HISTORY = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/history.json";

const map = L.map("map").setView([27.7,85.3],13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let localHistory = [];
let historyMarkers = [];

const mapTypeSelect = document.getElementById("mapType");

function getColor(type,val){
  if(type==="mq") return val<50?"#00ff00":val<100?"#ffff00":val<150?"#ff8000":"#ff0000";
  if(type==="temp") return val<20?"#00bfff":val<30?"#ffa500":"#ff0000";
  if(type==="hum") return val<40?"#00bfff":val<70?"#00ff00":"#ffa500";
}

function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// draw all history points as colored markers
function drawHistory(){
  historyMarkers.forEach(m=>map.removeLayer(m));
  historyMarkers = [];
  const type = mapTypeSelect.value;
  localHistory.forEach(h=>{
    const color = getColor(type,type==="mq"?h.mq:type==="temp"?h.temp:h.hum);
    const marker = L.circleMarker([h.lat,h.lon],{
      radius:6,
      fillColor: color,
      fillOpacity: 0.9,
      stroke: false
    }).addTo(map);
    historyMarkers.push(marker);
  });
}

// draw device latest location
function drawDevice(lat,lon,val,type,status,timestamp){
  const color = getColor(type,val);
  if(deviceMarker) map.removeLayer(deviceMarker);
  deviceMarker = L.circleMarker([lat,lon],{
    radius:12,
    fillColor: color,
    fillOpacity: 1.0,
    stroke: false
  }).addTo(map);
  deviceMarker.bindPopup(`<b>AQI:</b>${type==="mq"?val:"--"}<br>
                         <b>Temp:</b>${type==="temp"?val:"--"}<br>
                         <b>Hum:</b>${type==="hum"?val:"--"}<br>
                         <b>Status:</b>${status}<br>
                         <b>Time:</b>${new Date(timestamp).toLocaleString()}`);
}

// fetch history and draw
async function fetchHistory(){
  try{
    const res = await axios.get(FIREBASE_HISTORY);
    const data = res.data;
    if(!data) return;
    localHistory = Object.values(data);
    drawHistory();
  }catch(e){console.log("History fetch error:",e);}
}

// fetch current reading
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

    drawDevice(d.lat,d.lon,val,type,d.status,d.timestamp);

  }catch(e){console.log("Current fetch error:",e);}
}

mapTypeSelect.addEventListener("change",()=>{
  drawHistory();
  fetchCurrent();
});

// initial fetch
fetchHistory();
fetchCurrent();
setInterval(()=>{
  fetchHistory();
  fetchCurrent();
},5000);
