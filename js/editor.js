let routeCoords = [];
let history = [];
let mode = 'idle';
let selectStart = null, selectEnd = null;
let cutIndex = null;
let drawnPoints = [];
let polyline, vertexMarkers = [];
let drawPolyline = null;

const map = L.map('map').setView([53.355, -3.085], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

const waypointData = [
    { lat: 53.2886, lng: -3.0059, label: "A" },
    { lat: 53.3207, lng: -3.0457, label: "2" },
    { lat: 53.3571, lng: -3.0636, label: "3" },
    { lat: 53.3680, lng: -3.1015, label: "4" },
    { lat: 53.3735, lng: -3.1073, label: "5" },
    { lat: 53.4034, lng: -3.1382, label: "6" },
    { lat: 53.4076, lng: -3.1533, label: "7" },
    { lat: 53.4161, lng: -3.1199, label: "B" }
];
waypointData.forEach(wp => {
    L.circleMarker([wp.lat, wp.lng], {
        radius: 14, fillColor: '#FF9800', fillOpacity: 0.9,
        color: 'white', weight: 2
    }).addTo(map).bindTooltip(wp.label, {permanent: true, direction: 'center', className: 'wp-label'});
});

function setStatus(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status status-' + type;
}

function drawRoute() {
    if (polyline) map.removeLayer(polyline);
    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];

    polyline = L.polyline(routeCoords, {
        color: '#1976D2', weight: 4, opacity: 0.8
    }).addTo(map);

    if (mode === 'selecting' || mode === 'idle') {
        const zoom = map.getZoom();
        let step = 1;
        if (zoom < 13) step = 30;
        else if (zoom < 14) step = 15;
        else if (zoom < 15) step = 8;
        else if (zoom < 16) step = 4;
        else if (zoom < 17) step = 2;

        const bounds = map.getBounds();
        for (let i = 0; i < routeCoords.length; i += step) {
            const coord = routeCoords[i];
            if (!bounds.contains(coord)) continue;

            let extraClass = '';
            if (selectStart !== null && selectEnd !== null) {
                const lo = Math.min(selectStart, selectEnd);
                const hi = Math.max(selectStart, selectEnd);
                if (i >= lo && i <= hi) extraClass = ' vertex-cut';
            }
            if (i === selectStart || i === selectEnd) extraClass = ' vertex-selected';

            const marker = L.marker(coord, {
                icon: L.divIcon({
                    className: 'vertex-marker' + extraClass,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(map);
            marker._routeIndex = i;

            marker.on('click', function() {
                if (mode === 'selecting') {
                    onVertexClick(this._routeIndex);
                }
            });

            vertexMarkers.push(marker);
        }
    }
    document.getElementById('pointCount').textContent = routeCoords.length;
}

function onVertexClick(idx) {
    if (selectStart === null) {
        selectStart = idx;
        setStatus('Start selected (index ' + idx + '). Now click the END vertex.', 'warn');
        drawRoute();
    } else if (selectEnd === null) {
        selectEnd = idx;
        const lo = Math.min(selectStart, selectEnd);
        const hi = Math.max(selectStart, selectEnd);
        const count = hi - lo - 1;
        setStatus('Range: indices ' + lo + ' to ' + hi + ' (' + count + ' points between). Click Delete to remove them.', 'warn');
        document.getElementById('btnDeleteRange').style.display = 'block';
        drawRoute();
    }
}

function saveHistory() {
    history.push(JSON.parse(JSON.stringify(routeCoords)));
    if (history.length > 30) history.shift();
}

// Load default route
fetch('results/complete_v1.json')
    .then(r => r.json())
    .then(data => {
        routeCoords = data;
        history = [JSON.parse(JSON.stringify(routeCoords))];
        map.fitBounds(L.polyline(routeCoords).getBounds().pad(0.1));
        drawRoute();
        setStatus('Loaded route (' + routeCoords.length + ' points). Ready.', 'ok');
    })
    .catch(() => {
        setStatus('No default route found. Import a JSON file to start.', 'warn');
    });

// --- Buttons ---
document.getElementById('btnSelectRange').onclick = () => {
    mode = 'selecting';
    selectStart = null;
    selectEnd = null;
    setStatus('Click the FIRST vertex (start of bad section).', 'info');
    document.getElementById('btnDeleteRange').style.display = 'none';
    document.getElementById('btnCancelSelect').style.display = 'block';
    drawRoute();
};

document.getElementById('btnCancelSelect').onclick = () => {
    mode = 'idle';
    selectStart = null;
    selectEnd = null;
    document.getElementById('btnDeleteRange').style.display = 'none';
    document.getElementById('btnCancelSelect').style.display = 'none';
    setStatus('Cancelled.', 'info');
    drawRoute();
};

document.getElementById('btnDeleteRange').onclick = () => {
    const lo = Math.min(selectStart, selectEnd);
    const hi = Math.max(selectStart, selectEnd);
    routeCoords.splice(lo + 1, hi - lo - 1);
    cutIndex = lo + 1;
    saveHistory();
    mode = 'idle';
    selectStart = null;
    selectEnd = null;
    document.getElementById('btnDeleteRange').style.display = 'none';
    document.getElementById('btnCancelSelect').style.display = 'none';
    setStatus('Deleted! Cut point is at index ' + cutIndex + '. Now use Draw to fill the gap.', 'ok');
    drawRoute();
};

document.getElementById('btnDraw').onclick = () => {
    mode = 'drawing';
    drawnPoints = [];
    if (cutIndex === null) cutIndex = routeCoords.length;
    setStatus('Drawing mode. Click on the map to add points sequentially. They insert at index ' + cutIndex + '.', 'info');
    document.getElementById('btnFinishDraw').style.display = 'block';
    drawRoute();
};

document.getElementById('btnFinishDraw').onclick = () => {
    mode = 'idle';
    document.getElementById('btnFinishDraw').style.display = 'none';
    if (drawPolyline) { map.removeLayer(drawPolyline); drawPolyline = null; }
    setStatus('Drawing finished. ' + drawnPoints.length + ' points added.', 'ok');
    drawnPoints = [];
    cutIndex = null;
    drawRoute();
};

map.on('click', function(e) {
    if (mode === 'drawing') {
        const pt = [e.latlng.lat, e.latlng.lng];
        routeCoords.splice(cutIndex, 0, pt);
        cutIndex++;
        drawnPoints.push(pt);
        saveHistory();

        if (drawPolyline) map.removeLayer(drawPolyline);
        drawPolyline = L.polyline(drawnPoints, {
            color: '#4CAF50', weight: 5, opacity: 0.9, dashArray: '8,4'
        }).addTo(map);

        if (polyline) map.removeLayer(polyline);
        polyline = L.polyline(routeCoords, {
            color: '#1976D2', weight: 4, opacity: 0.8
        }).addTo(map);

        document.getElementById('pointCount').textContent = routeCoords.length;
    }
});

document.getElementById('btnUndo').onclick = () => {
    if (history.length > 1) {
        history.pop();
        routeCoords = JSON.parse(JSON.stringify(history[history.length - 1]));
        if (drawPolyline) { map.removeLayer(drawPolyline); drawPolyline = null; }
        drawnPoints = [];
        drawRoute();
        setStatus('Undone.', 'info');
    }
};

document.getElementById('btnImport').onclick = () => {
    document.getElementById('fileInput').click();
};

document.getElementById('fileInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
                routeCoords = data;
                history = [JSON.parse(JSON.stringify(routeCoords))];
                map.fitBounds(L.polyline(routeCoords).getBounds().pad(0.1));
                drawRoute();
                setStatus('Imported ' + routeCoords.length + ' points from ' + file.name, 'ok');
            } else {
                setStatus('Invalid format. Expected [[lat,lng], ...]', 'warn');
            }
        } catch (err) {
            setStatus('Error parsing JSON: ' + err.message, 'warn');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
};

document.getElementById('btnExport').onclick = () => {
    const json = JSON.stringify(routeCoords);
    navigator.clipboard.writeText(json).then(() => {
        setStatus('Copied to clipboard! (' + routeCoords.length + ' points)', 'ok');
    }).catch(() => {
        const blob = new Blob([json], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'route_edited.json';
        a.click();
        setStatus('Downloaded as route_edited.json', 'ok');
    });
};

map.on('zoomend moveend', () => {
    if (mode !== 'drawing') drawRoute();
});
