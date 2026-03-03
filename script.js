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
  if(type==="mq") return val<50?"#00ff00":val<100?"#ffff00":val<150?"#ff8000":"#ff0000";
  if(type==="temp") return val<20?"#00bfff":val<30?"#ffa500":"#ff0000";
  if(type==="hum") return val<40?"#00bfff":val<70?"#00ff00":"#ffa500";
}

// ================= Recenter =================
function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// ================= Draw history =================
function drawHistory(){
  historyCircles.forEach(c=>map.removeLayer(c));
  historyCircles = [];
  const type = mapTypeSelect.value;

  localHistory.forEach(h=>{
    if(!h.lat || !h.lon) return;

    const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;
    const color = getColor(type,val);

    const circle = L.circle([h.lat,h.lon],{
      radius: 80,
      fillColor: color,
      fillOpacity: 0.1,  // light blend
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

// ================= Draw latest device =================
function drawDevice(d){
  const type = mapTypeSelect.value;
  const val = type==="mq"?d.mq:type==="temp"?d.temp:d.hum;
  const color = getColor(type,val);

  if(deviceMarker) map.removeLayer(deviceMarker);
  deviceMarker = L.circleMarker([d.lat,d.lon],{
    radius:12,
    fillColor: color,
    fillOpacity: 1.0,
    stroke:false
  }).addTo(map);

  deviceMarker.bindPopup(`<b>AQI:</b> ${d.mq}<br>
                         <b>Temp:</b> ${d.temp} °C<br>
                         <b>Hum:</b> ${d.hum}%<br>
                         <b>Status:</b> ${d.status}<br>
                         <b>Time:</b> ${new Date(d.timestamp).toLocaleString()}`);
}

// ================= Dynamic Legend =================
function updateLegend(){
  const legendDiv = document.getElementById("readingsLegend");
  legendDiv.innerHTML = "";
  const type = mapTypeSelect.value;
  let items=[];
  if(type==="mq"){
    items=[{c:"#00ff00",l:"Healthy"},{c:"#ffff00",l:"Moderate"},{c:"#ff8000",l:"Unhealthy"},{c:"#ff0000",l:"Hazardous"}];
  }else if(type==="temp"){
    items=[{c:"#00bfff",l:"Cold"},{c:"#ffa500",l:"Warm"},{c:"#ff0000",l:"Hot"}];
  }else if(type==="hum"){
    items=[{c:"#00bfff",l:"Low"},{c:"#00ff00",l:"Comfort"},{c:"#ffa500",l:"High"}];
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

// ================= Fetch history =================
async function fetchHistory(){
  try{
    const res = await axios.get(FIREBASE_HISTORY);
    const data = res.data;
    if(!data) return;
    localHistory = Object.values(data).slice(-200); // last 200 readings
    drawHistory();
  }catch(e){console.log("History fetch error",e);}
}

// ================= Fetch current =================
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

    // Add latest reading to localHistory
    localHistory.push({
      lat:d.lat,
      lon:d.lon,
      mq:d.mq,
      temp:d.temp,
      hum:d.hum,
      status:d.status,
      timestamp:d.timestamp
    });
    if(localHistory.length>200) localHistory.shift();

    drawHistory();
    drawDevice(d);
  }catch(e){console.log("Current fetch error",e);}
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


// ================= Map search =================
const geocoder = L.Control.geocoder({
  defaultMarkGeocode: false
}).addTo(map);

geocoder.on('markgeocode', function(e) {
  const center = e.geocode.center;
  map.setView(center, 15);
});
