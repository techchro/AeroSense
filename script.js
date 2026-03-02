const FIREBASE_URL = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";

const map = L.map("map").setView([27.7,85.3],13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let deviceMarker = null;
let heatLayer = null;

// Map type select
const mapTypeSelect = document.getElementById("mapType");

function getColor(type,val){
  if(type==="mq") return val<50?"green":val<100?"yellow":val<150?"orange":"red";
  if(type==="temp") return val<25?"blue":val<35?"orange":"red";
  if(type==="hum") return val<40?"blue":val<70?"green":"orange";
}

function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// Last 30 readings UI
function updateLastReadings(history){
  const listDiv = document.getElementById("readingsList");
  const legendDiv = document.getElementById("readingsLegend");
  listDiv.innerHTML = "";
  legendDiv.innerHTML = "";

  if(!history) return;

  const type = mapTypeSelect.value;

  history.forEach(r => {
    const color = getColor(type, type==="mq"?r.mq:type==="temp"?r.temp:r.hum);
    const card = document.createElement("div");
    card.classList.add("reading-card");
    card.style.border = `2px solid ${color}`;
    card.innerHTML = `
      <p><b>${type==="mq"?"AQI":type==="temp"?"Temp":"Hum"}</b></p>
      <p style="color:${color}">${type==="mq"?r.mq:type==="temp"?r.temp:r.hum}</p>
      <p>${new Date(r.timestamp).toLocaleTimeString()}</p>
    `;
    listDiv.appendChild(card);
  });

  // Dynamic legend colors
  const colors = ["green","yellow","orange","red"];
  colors.forEach(c=>{
    const span = document.createElement("span");
    span.classList.add("legend-color");
    span.style.background = c;
    legendDiv.appendChild(span);
  });
}

// Heatmap
function generateHeatmap(history){
  if(heatLayer) map.removeLayer(heatLayer);
  const points = history.map(h=>{
    const val = mapTypeSelect.value==="mq"?h.mq:mapTypeSelect.value==="temp"?h.temp:h.hum;
    return [h.lat,h.lon,val];
  });
  heatLayer = L.heatLayer(points,{radius:25,blur:15,max:200}).addTo(map);
}

// Fetch data
async function fetchData(){
  try{
    const res = await axios.get(FIREBASE_URL);
    const d = res.data;
    if(!d) return;

    // Update stats
    document.getElementById("mq").innerText = d.mq ?? "--";
    document.getElementById("temp").innerText = isNaN(d.temp) ? "-- °C" : d.temp+" °C";
    document.getElementById("hum").innerText = isNaN(d.hum) ? "-- %" : d.hum+" %";
    document.getElementById("status").innerText = d.status ?? "--";
    document.getElementById("healthAdvice").innerText = d.status;

    // Device marker
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

    // Heatmap & last readings
    generateHeatmap(d.history);
    updateLastReadings(d.history);

  } catch(e){ console.log("Firebase error:",e); }
}

mapTypeSelect.addEventListener("change", fetchData);

setInterval(fetchData,2000);





// Dynamic color legend with labels
function updateDynamicLegend() {
  const legendDiv = document.getElementById("readingsLegend");
  legendDiv.innerHTML = ""; // Clear previous legend

  const type = mapTypeSelect.value;

  let legendItems = [];

  if(type === "mq"){ // AQI
    legendItems = [
      {color: "green", label: "Healthy"},
      {color: "yellow", label: "Moderate"},
      {color: "orange", label: "Unhealthy"},
      {color: "red", label: "Hazardous"}
    ];
  } else if(type === "temp"){ // Temperature
    legendItems = [
      {color: "blue", label: "Cool"},
      {color: "orange", label: "Warm"},
      {color: "red", label: "Hot"}
    ];
  } else if(type === "hum"){ // Humidity
    legendItems = [
      {color: "blue", label: "Low"},
      {color: "green", label: "Comfort"},
      {color: "orange", label: "High"}
    ];
  }

  legendItems.forEach(item => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginRight = "10px";

    const colorBox = document.createElement("span");
    colorBox.style.background = item.color;
    colorBox.style.width = "20px";
    colorBox.style.height = "20px";
    colorBox.style.borderRadius = "4px";
    colorBox.style.display = "inline-block";
    colorBox.style.marginRight = "5px";

    const label = document.createElement("span");
    label.innerText = item.label;
    label.style.fontSize = "14px";
    label.style.color = "#ffffff";

    container.appendChild(colorBox);
    container.appendChild(label);
    legendDiv.appendChild(container);
  });
}

// Call legend update whenever map type changes
mapTypeSelect.addEventListener("change", () => {
  updateDynamicLegend();
  fetchData(); // Refresh map & readings
});

// Initialize legend on page load
updateDynamicLegend();
