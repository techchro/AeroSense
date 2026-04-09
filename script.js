// ================= FIREBASE URLs =================

const FIREBASE_CURRENT = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/current.json";
const FIREBASE_HISTORY = "https://airqualitymapping-feca1-default-rtdb.asia-southeast1.firebasedatabase.app/air_quality/history.json";

// ================= MAP =================

const map = L.map("map-container").setView([27.55,84.5], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19
}).addTo(map);

let deviceMarker = null;
let historyCircles = [];

let localHistory = [];

const mapTypeSelect = document.getElementById("mapType");

// ================= COLOR SCALE =================

function getColor(type,val){

  if(type==="mq")
      return val<50?"#00ff88":val<100?"#ffff00":val<150?"#ff9933":"#ff4d4d";

  if(type==="temp")
      return val<20?"#66ccff":val<30?"#ffb84d":"#ff4d4d";

  if(type==="hum")
      return val<40?"#66ccff":val<70?"#66ff99":"#ffb84d";
}

// ================= HEX TO RGBA =================

function hexToRGBA(hex,alpha){

  const r = parseInt(hex.substring(1,3),16);
  const g = parseInt(hex.substring(3,5),16);
  const b = parseInt(hex.substring(5,7),16);

  return `rgba(${r},${g},${b},${alpha})`;
}

// ================= RECENTER =================

function recenterMap(){
  if(deviceMarker) map.setView(deviceMarker.getLatLng(),15);
}

// ================= DRAW DEVICE =================

function drawDevice(d){

  if(!d.lat || !d.lon) return;

  const type = mapTypeSelect.value;
  const val = type==="mq"?d.mq:type==="temp"?d.temp:d.hum;

  const color = getColor(type,val);

  if(deviceMarker) map.removeLayer(deviceMarker);

  deviceMarker = L.circleMarker([d.lat,d.lon],{

      radius:14,
      fillColor:color,
      fillOpacity:0.9,
      stroke:false

  }).addTo(map);

  deviceMarker.bindPopup(

    `<b>AQI:</b> ${d.mq}<br>
     <b>Temp:</b> ${d.temp} °C<br>
     <b>Hum:</b> ${d.hum}%<br>
     <b>Status:</b> ${d.status}<br>
     <b>Time:</b> ${d.timestamp}`

  );

}

// ================= DRAW HISTORY =================

function drawHistory(){

  historyCircles.forEach(c=>map.removeLayer(c));
  historyCircles = [];

  const type = mapTypeSelect.value;

  localHistory.forEach((h,index)=>{

    if(!h.lat || !h.lon) return;

    const val = type==="mq"?h.mq:type==="temp"?h.temp:h.hum;

    const baseColor = getColor(type,val);

    const opacity = 0.3;

    const circle = L.circle([h.lat,h.lon],{

      radius:100,
      fillColor:hexToRGBA(baseColor,opacity),
      fillOpacity:opacity,
      stroke:false

    }).addTo(map);

    circle.bindTooltip(

      `<b>AQI:</b> ${h.mq}<br>
       <b>Temp:</b> ${h.temp} °C<br>
       <b>Hum:</b> ${h.hum}%<br>
       <b>Time:</b> ${h.timestamp}`,

       {direction:"top"}

    );

    historyCircles.push(circle);

  });

}

// ================= UPDATE LEGEND =================

function updateLegend(){

  const legendDiv = document.getElementById("readingsLegend");

  legendDiv.innerHTML="";

  const type = mapTypeSelect.value;

  let items=[];

  if(type==="mq"){

    items=[
      {c:"#00ff88",l:"Healthy"},
      {c:"#ffff00",l:"Moderate"},
      {c:"#ff9933",l:"Unhealthy"},
      {c:"#ff4d4d",l:"Hazardous"}
    ];

  }

  if(type==="temp"){

    items=[
      {c:"#66ccff",l:"Cold"},
      {c:"#ffb84d",l:"Warm"},
      {c:"#ff4d4d",l:"Hot"}
    ];

  }

  if(type==="hum"){

    items=[
      {c:"#66ccff",l:"Low"},
      {c:"#66ff99",l:"Comfort"},
      {c:"#ffb84d",l:"High"}
    ];

  }

  items.forEach(i=>{

    const div=document.createElement("div");

    div.className="legend-item";

    div.innerHTML=`
    <div class="legend-color" style="background:${i.c}"></div>
    <div class="legend-label">${i.l}</div>
    `;

    legendDiv.appendChild(div);

  });

}

// ================= READINGS LIST =================

function renderReadingsList(){

  const readingsDiv=document.getElementById("readingsList");

  const latest = localHistory.slice(-10).reverse();

  readingsDiv.innerHTML = latest.map(h=>`

  <div class="reading-card">

  <p style="font-weight:700">${h.location || "Unknown"}</p>

  <p>AQI: <strong>${h.mq}</strong></p>

  <p>Temp: ${h.temp} °C</p>

  <p>Hum: ${h.hum}%</p>

  </div>

  `).join("");

}

// ================= FETCH CURRENT =================

async function fetchCurrent(){

  try{

    const res = await axios.get(FIREBASE_CURRENT);

    const d = res.data;

    if(!d) return;

    document.getElementById("mq").innerText = d.mq ?? "--";

    document.getElementById("temp").innerText = (d.temp ?? "--") + " °C";

    document.getElementById("hum").innerText = (d.hum ?? "--") + " %";

    document.getElementById("status").innerText = d.status ?? "--";

    document.getElementById("healthAdvice").innerText = d.status ?? "--";

    drawDevice(d);

  }

  catch(e){

    console.log("Firebase current error",e);

  }

}

// ================= FETCH HISTORY =================

async function fetchHistory(){

  try{

    const res = await axios.get(FIREBASE_HISTORY);

    const data = res.data;

    if(!data) return;

    localHistory = Object.values(data);

    drawHistory();

    renderReadingsList();

  }

  catch(e){

    console.log("Firebase history error",e);

  }

}

// ================= MAP TYPE CHANGE =================

mapTypeSelect.addEventListener("change",()=>{

  drawHistory();

  updateLegend();

});

// ================= INIT =================

updateLegend();

fetchCurrent();
fetchHistory();

setInterval(()=>{

  fetchCurrent();
  fetchHistory();

},3000);





// ================= HEALTH ADVISORY =================
function updateHealthAdvisory(aqi) {
  const advisoryDiv = document.getElementById("healthAdvice");
  if (!advisoryDiv) return;

  let advices = [];

  if (aqi <= 50) { // Good
    advices = [
      "Air quality is good. Enjoy outdoor activities.",
      "No special precautions needed.",
      "Keep exercising outdoors as normal.",
      "Maintain a balanced diet and hydrate.",
      "Open windows to ventilate your room.",
      "No mask required for healthy individuals.",
      "Encourage children to play outside."
    ];
  } 
  else if (aqi <= 100) { // Moderate
    advices = [
      "Sensitive people should reduce prolonged outdoor exertion.",
      "Wear a mask if you have respiratory issues.",
      "Limit outdoor activities if feeling unwell.",
      "Keep windows closed during high traffic times.",
      "Use air purifiers indoors if available.",
      "Drink plenty of water to stay hydrated.",
      "Monitor health if coughing or irritated."
    ];
  } 
  else if (aqi <= 150) { // Unhealthy for sensitive
    advices = [
      "Avoid prolonged outdoor activities.",
      "Wear a high-quality mask (N95/KN95) outdoors.",
      "Keep children and elderly indoors as much as possible.",
      "Close windows and use indoor air purifiers.",
      "Avoid strenuous exercise outside.",
      "Monitor any breathing difficulties.",
      "Stay hydrated and maintain a healthy diet."
    ];
  } 
  else { // Hazardous
    advices = [
      "Stay indoors and keep windows closed.",
      "Use air purifiers and avoid fans that bring outdoor air.",
      "Wear a high-quality mask if going outside is unavoidable.",
      "Avoid all outdoor activities.",
      "Limit exposure to sensitive individuals (children, elderly, respiratory patients).",
      "Keep hydrated and rest.",
      "Seek medical attention if feeling unwell.",
      "Reduce physical exertion indoors as well."
    ];
  }

  // Render advice as a list
  advisoryDiv.innerHTML = advices.map(a => `• ${a}`).join("<br>");
}
