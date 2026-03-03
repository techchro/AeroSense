const FIREBASE_HISTORY = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/history.json";
const FIREBASE_CURRENT = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";

const map = L.map("map").setView([27.55,84.5], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let localHistory = [];
let historyCircles = [];
const mapTypeSelect = document.getElementById("mapType");

function getColor(type,val){
  if(type==="mq") return val<50?"#00ff00":val<100?"#ffff00":val<150?"#ff8000":"#ff0000";
  if(type==="temp") return val<20?"#00bfff":val<30?"#ffa500":"#ff0000";
  if(type==="hum") return val<40?"#00bfff":val<70?"#00ff00":"#ffa500";
}

function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// Draw blended circles for history
function drawHistory(){
  historyCircles.forEach(c=>map.removeLayer(c));
  historyCircles = [];
  const type = mapTypeSelect.value;

  localHistory.forEach(h=>{
    const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    const color = getColor(type,val);
    const circle = L.circle([h.lat,h.lon],{
      radius: 80,       // larger for blending
      fillColor: color,
      fillOpacity: 0.15, // semi-transparent
      stroke: false
    }).addTo(map);
    historyCircles.push(circle);
  });
}

// Draw latest device location
function drawDevice(h){
  const type = mapTypeSelect.value;
  const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
  const color = getColor(type,val);

  if(deviceMarker) map.removeLayer(deviceMarker);
  deviceMarker = L.circleMarker([h.lat,h.lon],{
    radius:12,
    fillColor: color,
    fillOpacity: 1.0,
    stroke:false
  }).addTo(map);
  deviceMarker.bindPopup(`<b>AQI:</b>${h.mq}<br>
                         <b>Temp:</b>${h.temp} °C<br>
                         <b>Hum:</b>${h.hum}%<br>
                         <b>Status:</b>${h.status}<br>
                         <b>Time:</b>${new Date(h.timestamp).toLocaleString()}`);
}

// Fetch history from Firebase
async function fetchHistory(){
  try{
    const res = await axios.get(FIREBASE_HISTORY);
    const data = res.data;
    if(!data) return;
    localHistory = Object.values(data).slice(-200); // last 200 readings
    drawHistory();
  }catch(e){console.log("History fetch error",e);}
}

// Fetch current reading
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

    drawDevice(d);
  }catch(e){console.log("Current fetch error",e);}
}

mapTypeSelect.addEventListener("change",()=>{
  drawHistory();
  fetchCurrent();
});

// Initial fetch and update every 3 seconds
fetchHistory();
fetchCurrent();
setInterval(()=>{
  fetchHistory();
  fetchCurrent();
},3000);
